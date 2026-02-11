'use client'

import { apiFetch } from '@/lib/api'
import { Badge, Box, Flex, Spinner, Stack, Text } from '@chakra-ui/react'
import { useEffect, useState } from 'react'

interface Upload {
  id: string
  file_name: string
  file_type: string
  upload_type: string
  status: string
  created_at: string
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'yellow',
  parsing: 'blue',
  parsed: 'green',
  failed: 'red',
}

export function ReportsList() {
  const [uploads, setUploads] = useState<Upload[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiFetch<{ uploads: Upload[] }>('/api/uploads')
      .then((data) => setUploads(data.uploads))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <Box py="8" textAlign="center">
        <Spinner />
      </Box>
    )
  }

  if (uploads.length === 0) {
    return (
      <Box py="8" textAlign="center">
        <Text color="fg.muted">No reports yet. Upload a CV and JD to get started.</Text>
      </Box>
    )
  }

  return (
    <Stack gap="3">
      {uploads.map((upload) => (
        <Flex
          key={upload.id}
          p="3"
          borderWidth="1px"
          borderRadius="lg"
          justifyContent="space-between"
          alignItems="center"
        >
          <Box overflow="hidden">
            <Text fontSize="sm" fontWeight="medium" truncate>
              {upload.file_name}
            </Text>
            <Text fontSize="xs" color="fg.muted">
              {new Date(upload.created_at).toLocaleDateString()}
            </Text>
          </Box>
          <Flex gap="2" flexShrink={0}>
            <Badge fontSize="xs">{upload.upload_type.toUpperCase()}</Badge>
            <Badge colorPalette={STATUS_COLORS[upload.status] ?? 'gray'} fontSize="xs">
              {upload.status}
            </Badge>
          </Flex>
        </Flex>
      ))}
    </Stack>
  )
}
