import { BaseOpenAIService } from './base-service'

// Resume analysis result interface
export interface AIAnalysisResult {
  score: number
  feedback: string[]
  suggestions: string[]
  strengths: string[]
  weaknesses: string[]
}

// Resume analyzer service - evaluates resume quality and provides feedback
export class ResumeAnalyzerService extends BaseOpenAIService {
  static async analyzeResume(resumeContent: object): Promise<AIAnalysisResult> {
    const prompt = `
      Analyze this resume and provide a comprehensive evaluation:
      
      Resume Content: ${JSON.stringify(resumeContent, null, 2)}
      
      Please provide:
      1. Overall score (0-100)
      2. Specific feedback points
      3. Improvement suggestions
      4. Key strengths
      5. Areas for improvement
      
      Return the response as a JSON object with the following structure:
      {
        "score": number,
        "feedback": string[],
        "suggestions": string[],
        "strengths": string[],
        "weaknesses": string[]
      }
    `

    const messages = [
      {
        role: 'system' as const,
        content: 'You are an expert resume reviewer and career coach. Provide detailed, actionable feedback to help improve resumes.'
      },
      {
        role: 'user' as const,
        content: prompt
      }
    ]

    // Use optimized settings for analysis task
    const maxTokens = this.getOptimalTokens(1500);
    const temperature = this.getOptimalTemperature('analysis');
    
    return await this.makeStructuredRequest<AIAnalysisResult>(messages, maxTokens, temperature);
  }
} 