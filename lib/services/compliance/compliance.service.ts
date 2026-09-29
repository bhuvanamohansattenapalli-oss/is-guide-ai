import { prisma } from '@/lib/prisma'

/**
 * Service managing certification and compliance requirements
 */
export class ComplianceService {
  /**
   * Retrieve active certification frameworks (BIS CRS, ISI mark, Hallmarking, etc.)
   */
  static async getCertificationRequirements() {
    try {
      const certifications = await prisma.certificationRequirement.findMany({
        where: { status: 'ACTIVE' },
        orderBy: { name: 'asc' },
      })
      return certifications
    } catch (error) {
      console.warn('[ComplianceService.getCertificationRequirements] Fallback error:', error)
      return []
    }
  }

  /**
   * Retrieve certifications checked for a specific analysis
   */
  static async getAnalysisCertifications(analysisId: string) {
    try {
      const certifications = await prisma.analysisCertification.findMany({
        where: { analysisId },
        include: {
          certificationRequirement: true,
        },
      })
      return certifications
    } catch (error) {
      console.warn('[ComplianceService.getAnalysisCertifications] Fallback error:', error)
      return []
    }
  }
}
