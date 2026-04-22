// services/ConfidenceScorer.js
// Scores decisions with confidence metrics and uncertainty tracking

class ConfidenceScorer {
  /**
   * Score data completeness (0-100)
   * Checks what % of required fields are populated
   */
  static scoreDataCompleteness(record) {
    const required = [
      "title",
      "category",
      "location",
      "equipment",
      "priority",
      "shift",
      "date",
      "impact",
      "description",
    ];

    const populated = required.filter(
      (field) => record[field] !== null && record[field] !== undefined && record[field] !== ""
    ).length;

    return Math.round((populated / required.length) * 100);
  }

  /**
   * Score rule violations (0-100, higher = more violations)
   */
  static scoreRuleViolations(record, existingRecord) {
    let violationScore = 0;

    if (record.priority === "Critical" && record.impact === "Full line stop") {
      violationScore += 30; // Highest risk
    }

    if (existingRecord) {
      if (record.equipment === existingRecord.equipment) violationScore += 20;
      if (record.location === existingRecord.location) violationScore += 15;
      if (record.shift === existingRecord.shift) violationScore += 10;
    }

    // Cap at 100
    return Math.min(violationScore, 100);
  }

  /**
   * Score consensus between GLM decision and rule-based fallback
   * Higher = more agreement = higher confidence
   */
  static scoreConsensus(glmDecision, rulesDecision) {
    let consensusScore = 50; // Base score

    if (glmDecision.conflict === rulesDecision.conflict) consensusScore += 20;
    if (glmDecision.severity === rulesDecision.severity) consensusScore += 15;
    if (glmDecision.actionType === rulesDecision.actionType) consensusScore += 15;

    return Math.min(consensusScore, 100);
  }

  /**
   * Extract confidence from GLM response
   */
  static extractGLMConfidence(glmResponse) {
    // If GLM includes a confidence field, use it
    if (glmResponse.confidence !== undefined) {
      return Math.max(0, Math.min(100, glmResponse.confidence));
    }

    // Otherwise, infer from response structure
    let confidence = 60; // Base GLM confidence

    if (glmResponse.reason || glmResponse.reasoning)
      confidence += 10;
    if (glmResponse.escalationNeeded === false) confidence += 10;

    return Math.min(confidence, 100);
  }

  /**
   * Calculate overall confidence score
   * Weighted combination of all factors
   */
  static calculateOverallConfidence(
    completenessScore,
    violationScore,
    consensusScore,
    glmConfidence
  ) {
    // Invert violation score (higher violations = lower confidence)
    const violationFactor = 100 - violationScore;

    const weights = {
      completeness: 0.25,
      violations: 0.25,
      consensus: 0.25,
      glm: 0.25,
    };

    const overall = Math.round(
      completenessScore * weights.completeness +
      violationFactor * weights.violations +
      consensusScore * weights.consensus +
      glmConfidence * weights.glm
    );

    return Math.max(0, Math.min(100, overall));
  }

  /**
   * Generate confidence report
   */
  static generateReport(record, existingRecord, glmDecision, rulesDecision) {
    const completeness = this.scoreDataCompleteness(record);
    const violations = this.scoreRuleViolations(record, existingRecord);
    const consensus = this.scoreConsensus(glmDecision, rulesDecision);
    const glmConf = this.extractGLMConfidence(glmDecision);

    const overall = this.calculateOverallConfidence(
      completeness,
      violations,
      consensus,
      glmConf
    );

    return {
      overallScore: overall,
      factors: {
        dataCompleteness: completeness,
        ruleViolations: violations,
        consensusWithRules: consensus,
        glmConfidence: glmConf,
      },
      uncertainty: 100 - overall,
      level:
        overall >= 80
          ? "HIGH"
          : overall >= 60
          ? "MEDIUM"
          : "LOW",
      recommendation: overall < 60 ? "ESCALATE_TO_HUMAN" : "PROCEED",
    };
  }
}

module.exports = { ConfidenceScorer };
