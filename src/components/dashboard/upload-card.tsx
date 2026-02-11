'use client'

import { toaster } from '@/components/ui/toaster'
import { uploadAndNotify, validateFile } from '@/lib/upload'
import { Box, Button, Card, FileUpload, Heading, Icon, Text } from '@chakra-ui/react'
import { useState } from 'react'
import { LuFile, LuUpload, LuX } from 'react-icons/lu'

interface Props {
  uploadType: 'cv' | 'jd'
  label: string
  userId: string
  onUploaded: (meta: { uploadId: string; storagePath: string; fileName: string }) => void
  onRemoved: () => void
  uploadedFile?: { fileName: string; uploadId: string; storagePath: string } | null
}

export function UploadCard({ uploadType, label, userId, onUploaded, onRemoved, uploadedFile }: Props) {
  const [uploading, setUploading] = useState(false)

  async function handleFileChange(details: { acceptedFiles: File[] }) {
    const file = details.acceptedFiles[0]
    if (!file) return

    const validation = validateFile(file)
    if (!validation.valid) {
      toaster.error({ title: 'Invalid file', description: validation.error })
      return
    }

    setUploading(true)
    try {
      const result = await uploadAndNotify(file, uploadType, userId)
      onUploaded({ uploadId: result.uploadId, storagePath: result.storagePath, fileName: file.name })
    } catch (e) {
      toaster.error({ title: 'Upload failed', description: e instanceof Error ? e.message : 'Unknown error' })
    } finally {
      setUploading(false)
    }
  }

  function handleRemove() {
    onRemoved()
  }

  return (
    <Card.Root p="0" overflow="hidden">
      <Card.Body p="4">
        <Heading size="sm" mb="3">
          {label}
        </Heading>

        {uploadedFile ? (
          <Box
            borderWidth="2px"
            borderStyle="dashed"
            borderColor="green.300"
            borderRadius="lg"
            p="4"
            display="flex"
            alignItems="center"
            justifyContent="space-between"
          >
            <Box display="flex" alignItems="center" gap="2" overflow="hidden">
              <Icon as={LuFile} color="green.500" />
              <Text fontSize="sm" truncate>
                {uploadedFile.fileName}
              </Text>
            </Box>
            <Button variant="ghost" size="xs" onClick={handleRemove} aria-label="Remove file">
              <LuX />
            </Button>
          </Box>
        ) : (
          <FileUpload.Root
            maxFiles={1}
            accept={['application/pdf', '.docx', 'text/plain']}
            maxFileSize={10 * 1024 * 1024}
            onFileChange={handleFileChange}
            disabled={uploading}
          >
            <FileUpload.HiddenInput />
            <FileUpload.Dropzone
              borderWidth="2px"
              borderStyle="dashed"
              borderRadius="lg"
              p="8"
              textAlign="center"
              cursor="pointer"
              _hover={{ borderColor: 'blue.300' }}
            >
              <Icon as={LuUpload} boxSize="8" color="fg.muted" mb="2" />
              <Text fontSize="sm" color="fg.muted">
                {uploading ? 'Uploading...' : 'Click to browse files.'}
              </Text>
              <Text fontSize="xs" color="fg.subtle">
                PDF, DOCX, or TXT (max 10 MB)
              </Text>
            </FileUpload.Dropzone>
          </FileUpload.Root>
        )}
      </Card.Body>
    </Card.Root>
  )
}
