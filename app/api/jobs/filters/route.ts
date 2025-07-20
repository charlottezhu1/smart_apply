import { createServerComponentClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createServerComponentClient()
    
    // Get unique industries
    const { data: industries } = await supabase
      .from('job_postings')
      .select('industry')
      .not('industry', 'is', null)
      .not('industry', 'eq', '')
    
    // Get unique locations (cities)
    const { data: locations } = await supabase
      .from('job_postings')
      .select('location')
      .not('location', 'is', null)
      .not('location', 'eq', '')
    
    // Get unique remote work types
    const { data: remoteTypes } = await supabase
      .from('job_postings')
      .select('remote_work_type')
      .not('remote_work_type', 'is', null)
      .not('remote_work_type', 'eq', '')
    
    // Get unique job types
    const { data: jobTypes } = await supabase
      .from('job_postings')
      .select('job_type')
      .not('job_type', 'is', null)
      .not('job_type', 'eq', '')
    
    // Process and deduplicate data
    const uniqueIndustries = Array.from(
      new Set(industries?.map(item => item.industry).filter(Boolean))
    ).sort()
    
    const uniqueLocations = Array.from(
      new Set(locations?.map(item => item.location).filter(Boolean))
    ).sort()
    
    const uniqueRemoteTypes = Array.from(
      new Set(remoteTypes?.map(item => item.remote_work_type).filter(Boolean))
    ).sort()
    
    const uniqueJobTypes = Array.from(
      new Set(jobTypes?.map(item => item.job_type).filter(Boolean))
    ).sort()
    
    return NextResponse.json({
      industries: uniqueIndustries,
      locations: uniqueLocations,
      remoteTypes: uniqueRemoteTypes,
      jobTypes: uniqueJobTypes
    })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch filter options' },
      { status: 500 }
    )
  }
}