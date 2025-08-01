import { BaseOpenAIService } from './base-service'

// Content enhancement result interface
export interface ContentEnhancementResult {
  originalText: string
  enhancedText: string
  improvements: string[]
  confidence: number
}

// Content enhancer service - improves resume section content
export class ContentEnhancerService extends BaseOpenAIService {
  static async enhanceSection(
    sectionType: string, 
    originalContent: string, 
    jobDescription?: string
  ): Promise<ContentEnhancementResult> {
    const prompt = `
      Enhance this ${sectionType} section for a resume:
      
      Current Content: ${originalContent}
      ${jobDescription ? `Target Job: ${jobDescription}` : ''}
      
      Please:
      1. Improve the writing quality and impact
      2. Use action verbs and quantifiable achievements
      3. Optimize for ATS keywords (if job description provided)
      4. Maintain the original intent and truthfulness
      5. Keep it concise and professional
      
      Return the response as a JSON object with the following structure:
      {
        "originalText": "${originalContent}",
        "enhancedText": "improved version",
        "improvements": ["list of specific improvements made"],
        "confidence": number (0-1)
      }
    `

    const messages = [
      {
        role: 'system' as const,
        content: 'You are a professional resume writer. Enhance resume sections to be more compelling and ATS-friendly while maintaining accuracy.'
      },
      {
        role: 'user' as const,
        content: prompt
      }
    ]

    // Use optimized settings for generation task
    const maxTokens = this.getOptimalTokens(1000);
    const temperature = this.getOptimalTemperature('generation');
    
    return await this.makeStructuredRequest<ContentEnhancementResult>(messages, maxTokens, temperature);
  }
} 