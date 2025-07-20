'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { 
  Building, 
  MapPin, 
  Clock, 
  DollarSign, 
  Users, 
  Briefcase,
  Calendar,
  User,
  Mail,
  Heart
} from 'lucide-react'

interface JobDetails {
  id: string
  title: string
  company_name: string
  location: string
  description: string
  requirements?: string
  salary_range?: string
  job_type?: string
  industry?: string
  remote_work_type?: string
  work_days_per_week?: string
  department?: string
  job_level?: string
  contact_method?: string
  special_preferences?: string
  submitter_name?: string
  recruiter_type?: string
  service_types?: string[]
  submission_date?: string
  created_at: string
  updated_at: string
}

interface JobDetailsModalProps {
  jobId: string | null
  isOpen: boolean
  onClose: () => void
}

export function JobDetailsModal({ jobId, isOpen, onClose }: JobDetailsModalProps) {
  const [job, setJob] = useState<JobDetails | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  useEffect(() => {
    if (jobId && isOpen) {
      loadJobDetails(jobId)
    }
  }, [jobId, isOpen])
  
  const loadJobDetails = async (id: string) => {
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await fetch(`/api/jobs/${id}`)
      if (response.ok) {
        const data = await response.json()
        setJob(data.job)
      } else {
        setError('职位信息加载失败')
      }
    } catch (error) {
      setError('网络错误，请稍后重试')
      console.error('Failed to load job details:', error)
    } finally {
      setIsLoading(false)
    }
  }
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }
  
  const getRemoteWorkBadge = (remoteType?: string) => {
    if (!remoteType) return null
    
    if (remoteType.includes('远程')) {
      return <Badge className="bg-green-100 text-green-800">远程工作</Badge>
    } else if (remoteType.includes('部分远程')) {
      return <Badge className="bg-blue-100 text-blue-800">混合办公</Badge>
    } else if (remoteType.includes('不能远程')) {
      return <Badge variant="outline">现场办公</Badge>
    }
    return <Badge variant="outline">{remoteType}</Badge>
  }
  
  const extractEmailFromDescription = (description: string) => {
    const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g
    const matches = description.match(emailRegex)
    return matches ? matches[0] : null
  }
  
  if (!isOpen) return null
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[95vh] overflow-y-auto p-0">
        {isLoading && (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        )}
        
        {error && (
          <div className="text-center py-8">
            <p className="text-red-600">{error}</p>
            <Button onClick={() => jobId && loadJobDetails(jobId)} className="mt-4">
              重试
            </Button>
          </div>
        )}
        
        {job && (
          <div className="flex flex-col h-full">
            <DialogHeader className="px-6 pt-6 pb-4 border-b border-border">
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <DialogTitle className="text-2xl font-bold leading-tight mb-2">
                      {job.title}
                    </DialogTitle>
                    <div className="flex items-center gap-2 text-lg text-muted-foreground">
                      <Building className="h-5 w-5" />
                      <span>{job.company_name}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      <Heart className="h-4 w-4 mr-1" />
                      收藏
                    </Button>
                    <Button size="sm">
                      立即申请
                    </Button>
                  </div>
                </div>
                
                {/* Key Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {job.location && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{job.location}</span>
                    </div>
                  )}
                  
                  {job.salary_range && (
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium text-green-600">{job.salary_range}</span>
                    </div>
                  )}
                  
                  {job.work_days_per_week && (
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-blue-600" />
                      <span className="text-sm">{job.work_days_per_week}</span>
                    </div>
                  )}
                  
                  {job.department && (
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{job.department}</span>
                    </div>
                  )}
                </div>
                
                {/* Badges */}
                <div className="flex flex-wrap gap-2">
                  {getRemoteWorkBadge(job.remote_work_type)}
                  {job.industry && (
                    <Badge variant="outline">
                      <Briefcase className="h-3 w-3 mr-1" />
                      {job.industry}
                    </Badge>
                  )}
                  {job.job_level && <Badge variant="outline">{job.job_level}</Badge>}
                  {job.job_type && <Badge variant="outline">{job.job_type}</Badge>}
                </div>
              </div>
            </DialogHeader>
            
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-muted-foreground/20 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb:hover]:bg-muted-foreground/30">
              {/* Job Description */}
              <div className="bg-muted/30 rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-3">职位描述</h3>
                <div className="prose prose-sm max-w-none">
                  <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-foreground">
                    {job.description}
                  </pre>
                </div>
              </div>
              
              {/* Requirements */}
              {job.requirements && (
                <div className="bg-muted/30 rounded-lg p-4">
                  <h3 className="text-lg font-semibold mb-3">招聘需求</h3>
                  <p className="text-sm text-foreground leading-relaxed">{job.requirements}</p>
                </div>
              )}
              
              {/* Special Preferences */}
              {job.special_preferences && job.special_preferences !== '无' && (
                <Card>
                  <CardContent className="pt-6">
                    <h3 className="text-lg font-semibold mb-3">特殊偏好</h3>
                    <p className="text-sm">{job.special_preferences}</p>
                  </CardContent>
                </Card>
              )}
              
              {/* Contact Information */}
              <div className="bg-muted/30 rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-3">联系方式</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {job.submitter_name && (
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">联系人: {job.submitter_name}</span>
                      </div>
                    )}
                    
                    {job.recruiter_type && (
                      <div className="flex items-center gap-2">
                        <Briefcase className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">招聘方: {job.recruiter_type}</span>
                      </div>
                    )}
                    
                    {job.contact_method && (
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">联系方式: {job.contact_method}</span>
                      </div>
                    )}
                    
                    {/* Extract email from description */}
                    {(() => {
                      const email = extractEmailFromDescription(job.description)
                      return email ? (
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-blue-600" />
                          <a href={`mailto:${email}`} className="text-sm text-blue-600 hover:underline">
                            {email}
                          </a>
                        </div>
                      ) : null
                    })()}
                </div>
              </div>
              
              {/* Metadata */}
              <div className="bg-muted/30 rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-3">发布信息</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>发布时间: {formatDate(job.created_at)}</span>
                    </div>
                    {job.submission_date && (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>投递截止: {formatDate(job.submission_date)}</span>
                      </div>
                    )}
                  </div>
                  
                  {job.service_types && job.service_types.length > 0 && (
                    <div className="mt-3">
                      <p className="text-sm font-medium mb-2">服务类型:</p>
                      <div className="flex flex-wrap gap-1">
                        {job.service_types.map((service, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {service}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}