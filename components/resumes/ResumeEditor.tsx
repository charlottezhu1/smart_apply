'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ResumeContent } from '@/lib/resume/parser'
import { useResumeEditor, formatAchievements, parseAchievements } from '@/hooks/useResumeEditor'
import { useAI } from '@/hooks/useAI'
import { ResumeEditorSidebar } from './ResumeEditorSidebar'
import { useUIStore } from '@/store/ui'
import { useIsMobile } from '@/hooks/use-mobile'
import { cn } from '@/lib/utils'
import { Plus, Trash2, Sparkles, AlertCircle } from 'lucide-react'

interface ResumeEditorProps {
  resumeId: string
  onSave?: (content: ResumeContent) => void
}

export function ResumeEditor({ resumeId, onSave }: ResumeEditorProps) {
  const { 
    content, 
    loading, 
    error,
    loadResume, 
    saveResume, 
    clearError,
    updateContact,
    updateSummary,
    addExperience,
    updateExperience,
    removeExperience,
    addEducation,
    updateEducation,
    removeEducation,
    updateSkills,
    addProject,
    updateProject,
    removeProject
  } = useResumeEditor()
  
  const [activeSection, setActiveSection] = useState<string>('contact')
  const { enhanceSection, isEnhancing, error: aiError, clearError: clearAIError } = useAI()
  
  const isMobile = useIsMobile()
  const autoCollapseTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const { 
    editorSidebarCollapsed,
    autoCollapseEditorSidebar
  } = useUIStore()

  const handleEnhanceSection = async (sectionType: string, currentContent: string) => {
    try {
      clearAIError()
      const result = await enhanceSection(sectionType, currentContent)
      
      if (content) {
        // Update the specific section with enhanced content
        switch (sectionType) {
          case 'summary':
            updateSummary(result.enhancedText)
            break
          case 'contact':
            // For contact, we might enhance the summary/headline
            break
          default:
            console.warn(`Enhancement not implemented for section: ${sectionType}`)
        }
        
        // Auto-save after AI enhancement
        await handleSave()
      }
    } catch (error) {
      console.error('Failed to enhance section:', error)
    }
  }

  useEffect(() => {
    if (resumeId) {
      loadResume(resumeId)
    }
  }, [resumeId, loadResume])

  const handleSave = async () => {
    await saveResume()
    if (content) {
      onSave?.(content)
    }
  }

  // Auto-collapse functionality for main content area
  const scheduleAutoCollapse = useCallback(() => {
    if (isMobile) return
    
    if (autoCollapseTimeoutRef.current) {
      clearTimeout(autoCollapseTimeoutRef.current)
    }
    
    autoCollapseTimeoutRef.current = setTimeout(() => {
      autoCollapseEditorSidebar()
    }, 500)
  }, [isMobile, autoCollapseEditorSidebar])

  const handleMainContentClick = useCallback(() => {
    if (!isMobile && !editorSidebarCollapsed) {
      scheduleAutoCollapse()
    }
  }, [isMobile, editorSidebarCollapsed, scheduleAutoCollapse])


  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Loading resume...</p>
      </div>
    )
  }

  if (!content) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Resume not found</p>
      </div>
    )
  }

  const sections = [
    { id: 'contact', label: 'Contact Info', icon: '👤' },
    { id: 'summary', label: 'Summary', icon: '📝' },
    { id: 'experience', label: 'Experience', icon: '💼' },
    { id: 'education', label: 'Education', icon: '🎓' },
    { id: 'skills', label: 'Skills', icon: '🔧' },
    { id: 'projects', label: 'Projects', icon: '🚀' }
  ]

  return (
    <div className="flex h-full">
      {/* Editor Sidebar */}
      <ResumeEditorSidebar
        sections={sections}
        activeSection={activeSection}
        onSectionChange={setActiveSection}
      />
      
      {/* Main Content */}
      <div 
        className={cn(
          "flex-1 transition-all duration-300 ease-in-out",
          "overflow-y-auto"
        )}
        onClick={handleMainContentClick}
      >
        <div className="p-4 space-y-4">
          {aiError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                AI Enhancement Error: {aiError}
                <button onClick={clearAIError} className="ml-2 text-sm underline">
                  Dismiss
                </button>
              </AlertDescription>
            </Alert>
          )}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {error}
                <button onClick={clearError} className="ml-2 text-sm underline">
                  Dismiss
                </button>
              </AlertDescription>
            </Alert>
          )}
          
          {/* Section Editor */}
          <div>
        {activeSection === 'contact' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span>👤</span>
                Contact Information
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="ml-auto gap-1"
                  onClick={() => handleEnhanceSection('contact', `${content?.contact.name || ''} ${content?.contact.email || ''}`)}
                  disabled={isEnhancing}
                >
                  <Sparkles className="h-3 w-3" />
                  {isEnhancing ? 'Enhancing...' : 'AI Enhance'}
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    value={content.contact.name || ''}
                    onChange={(e) => updateContact('name', e.target.value)}
                    placeholder="Enter your full name"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={content.contact.email || ''}
                    onChange={(e) => updateContact('email', e.target.value)}
                    placeholder="your.email@example.com"
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={content.contact.phone || ''}
                    onChange={(e) => updateContact('phone', e.target.value)}
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
                <div>
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={content.contact.location || ''}
                    onChange={(e) => updateContact('location', e.target.value)}
                    placeholder="City, State"
                  />
                </div>
                <div>
                  <Label htmlFor="linkedin">LinkedIn</Label>
                  <Input
                    id="linkedin"
                    value={content.contact.linkedin || ''}
                    onChange={(e) => updateContact('linkedin', e.target.value)}
                    placeholder="linkedin.com/in/yourprofile"
                  />
                </div>
                <div>
                  <Label htmlFor="github">GitHub</Label>
                  <Input
                    id="github"
                    value={content.contact.github || ''}
                    onChange={(e) => updateContact('github', e.target.value)}
                    placeholder="github.com/yourusername"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {activeSection === 'summary' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span>📝</span>
                Professional Summary
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="ml-auto gap-1"
                  onClick={() => handleEnhanceSection('summary', content?.summary || '')}
                  disabled={isEnhancing}
                >
                  <Sparkles className="h-3 w-3" />
                  {isEnhancing ? 'Enhancing...' : 'AI Enhance'}
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={content.summary || ''}
                onChange={(e) => updateSummary(e.target.value)}
                placeholder="Write a compelling professional summary that highlights your key achievements and career goals..."
                className="min-h-32"
              />
            </CardContent>
          </Card>
        )}

        {activeSection === 'experience' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span>💼</span>
                Work Experience
                <Button size="sm" onClick={addExperience} className="ml-auto gap-1">
                  <Plus className="h-3 w-3" />
                  Add Experience
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {content.experience.map((exp, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Experience {index + 1}</h4>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="gap-1">
                        <Sparkles className="h-3 w-3" />
                        AI Enhance
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => removeExperience(index)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <Label>Job Title</Label>
                      <Input
                        value={exp.title}
                        onChange={(e) => updateExperience(index, 'title', e.target.value)}
                        placeholder="Software Engineer"
                      />
                    </div>
                    <div>
                      <Label>Company</Label>
                      <Input
                        value={exp.company}
                        onChange={(e) => updateExperience(index, 'company', e.target.value)}
                        placeholder="Tech Company Inc."
                      />
                    </div>
                    <div>
                      <Label>Start Date</Label>
                      <Input
                        value={exp.startDate || ''}
                        onChange={(e) => updateExperience(index, 'startDate', e.target.value)}
                        placeholder="Jan 2020"
                      />
                    </div>
                    <div>
                      <Label>End Date</Label>
                      <Input
                        value={exp.endDate || ''}
                        onChange={(e) => updateExperience(index, 'endDate', e.target.value)}
                        placeholder="Present"
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Role Description</Label>
                    <Input
                      value={exp.description || ''}
                      onChange={(e) => updateExperience(index, 'description', e.target.value)}
                      placeholder="Brief overview of your role"
                    />
                  </div>
                  <div>
                    <Label>Key Achievements</Label>
                    <Textarea
                      value={formatAchievements(exp.achievements)}
                      onChange={(e) => updateExperience(index, 'achievements', parseAchievements(e.target.value))}
                      placeholder="• Achievement 1&#10;• Achievement 2&#10;• Achievement 3"
                      className="min-h-32"
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {activeSection === 'education' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span>🎓</span>
                Education
                <Button size="sm" onClick={addEducation} className="ml-auto gap-1">
                  <Plus className="h-3 w-3" />
                  Add Education
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {content.education.map((edu, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Education {index + 1}</h4>
                    <Button size="sm" variant="outline" onClick={() => removeEducation(index)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <Label>Degree</Label>
                      <Input
                        value={edu.degree}
                        onChange={(e) => updateEducation(index, 'degree', e.target.value)}
                        placeholder="Bachelor of Science in Computer Science"
                      />
                    </div>
                    <div>
                      <Label>School</Label>
                      <Input
                        value={edu.school}
                        onChange={(e) => updateEducation(index, 'school', e.target.value)}
                        placeholder="University Name"
                      />
                    </div>
                    <div>
                      <Label>Graduation Year</Label>
                      <Input
                        value={edu.graduationDate || ''}
                        onChange={(e) => updateEducation(index, 'graduationDate', e.target.value)}
                        placeholder="2020"
                      />
                    </div>
                    <div>
                      <Label>GPA (Optional)</Label>
                      <Input
                        value={edu.gpa || ''}
                        onChange={(e) => updateEducation(index, 'gpa', e.target.value)}
                        placeholder="3.8"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {activeSection === 'skills' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span>🔧</span>
                Skills
                <Button size="sm" variant="outline" className="ml-auto gap-1">
                  <Sparkles className="h-3 w-3" />
                  AI Enhance
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Skills (comma-separated)</Label>
                <Textarea
                  value={content.skills.join(', ')}
                  onChange={(e) => updateSkills(e.target.value)}
                  placeholder="JavaScript, React, Node.js, Python, SQL, Git..."
                  className="min-h-24"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {content.skills.map((skill, index) => (
                  <Badge key={index} variant="secondary">
                    {skill}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {activeSection === 'projects' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span>🚀</span>
                Projects
                <Button size="sm" onClick={addProject} className="ml-auto gap-1">
                  <Plus className="h-3 w-3" />
                  Add Project
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {(content.projects || []).map((project, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Project {index + 1}</h4>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="gap-1">
                        <Sparkles className="h-3 w-3" />
                        AI Enhance
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => removeProject(index)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <Label>Project Name</Label>
                      <Input
                        value={project.name}
                        onChange={(e) => updateProject(index, 'name', e.target.value)}
                        placeholder="Project Name"
                      />
                    </div>
                    <div>
                      <Label>Project URL</Label>
                      <Input
                        value={project.url || ''}
                        onChange={(e) => updateProject(index, 'url', e.target.value)}
                        placeholder="https://github.com/username/project"
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Project Overview</Label>
                    <Input
                      value={project.description}
                      onChange={(e) => updateProject(index, 'description', e.target.value)}
                      placeholder="Brief project description"
                    />
                  </div>
                  <div>
                    <Label>Key Features/Accomplishments</Label>
                    <Textarea
                      value={formatAchievements(project.details)}
                      onChange={(e) => updateProject(index, 'details', parseAchievements(e.target.value))}
                      placeholder="• Feature 1&#10;• Feature 2&#10;• Accomplishment 3"
                      className="min-h-24"
                    />
                  </div>
                  <div>
                    <Label>Technologies Used</Label>
                    <Input
                      value={project.technologies?.join(', ') || ''}
                      onChange={(e) => updateProject(index, 'technologies', e.target.value.split(',').map(t => t.trim()).filter(t => t.length > 0))}
                      placeholder="React, Node.js, PostgreSQL"
                    />
                  </div>
                </div>
              ))}
              {(content.projects || []).length === 0 && (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No projects added yet.</p>
                  <p className="text-sm text-muted-foreground">Click &quot;Add Project&quot; to get started.</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
          </div>
        </div>
      </div>
    </div>
  )
}