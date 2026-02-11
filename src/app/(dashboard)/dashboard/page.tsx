'use client'

import { ReportsList } from '@/components/dashboard/reports-list'
import { StartAnalysisButton } from '@/components/dashboard/start-analysis-button'
import { UploadCard } from '@/components/dashboard/upload-card'
import { apiFetch } from '@/lib/api'
import { Badge, Box, Heading, SimpleGrid, Tabs, Text } from '@chakra-ui/react'
import { useCallback, useEffect, useState } from 'react'

interface Profile {
  id: string
  full_name: string | null
  email: string
  subscription_tier: string
  usage: { analyses_used: number; analyses_limit: number }
}

interface UploadedFile {
  uploadId: string
  storagePath: string
  fileName: string
}

export default function DashboardPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [jdFile, setJdFile] = useState<UploadedFile | null>(null)
  const [cvFile, setCvFile] = useState<UploadedFile | null>(null)

  useEffect(() => {
    apiFetch<Profile>('/api/profile')
      .then(setProfile)
      .catch(() => {})
  }, [])

  const displayName = profile?.full_name || profile?.email?.split('@')[0] || 'there'

  const handleRemoveJd = useCallback(async () => {
    if (jdFile) {
      await apiFetch(`/api/upload/${jdFile.uploadId}`, { method: 'DELETE' }).catch(() => {})
      setJdFile(null)
    }
  }, [jdFile])

  const handleRemoveCv = useCallback(async () => {
    if (cvFile) {
      await apiFetch(`/api/upload/${cvFile.uploadId}`, { method: 'DELETE' }).catch(() => {})
      setCvFile(null)
    }
  }, [cvFile])

  return (
    <Box>
      <Box mb="6">
        <Heading size="lg">Hi, {displayName}</Heading>
        <Text color="fg.muted" mt="1">
          Upload your job description &amp; CV.
        </Text>
        {profile && (
          <Badge mt="2" colorPalette="blue">
            {profile.subscription_tier.charAt(0).toUpperCase() + profile.subscription_tier.slice(1)} Plan
            {' \u2022 '}
            {profile.usage.analyses_used}/{profile.usage.analyses_limit === 999999 ? '\u221E' : profile.usage.analyses_limit}
          </Badge>
        )}
      </Box>

      <Tabs.Root defaultValue="new">
        <Tabs.List>
          <Tabs.Trigger value="new">New</Tabs.Trigger>
          <Tabs.Trigger value="reports">Reports</Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="new">
          <SimpleGrid columns={{ base: 1, md: 2 }} gap="4" mt="4">
            <UploadCard
              uploadType="jd"
              label="Job Description"
              userId={profile?.id ?? ''}
              onUploaded={setJdFile}
              onRemoved={handleRemoveJd}
              uploadedFile={jdFile}
            />
            <UploadCard
              uploadType="cv"
              label="CV / Resume"
              userId={profile?.id ?? ''}
              onUploaded={setCvFile}
              onRemoved={handleRemoveCv}
              uploadedFile={cvFile}
            />
          </SimpleGrid>
          <Box mt="6">
            <StartAnalysisButton disabled={!jdFile || !cvFile} />
          </Box>
        </Tabs.Content>

        <Tabs.Content value="reports">
          <Box mt="4">
            <ReportsList />
          </Box>
        </Tabs.Content>
      </Tabs.Root>
    </Box>
  )
}
