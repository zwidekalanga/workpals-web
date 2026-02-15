"use client";

import { toaster } from "@/components/ui/toaster";
import { uploadAndNotify, validateFile } from "@/lib/upload";
import { Box, Button, Card, FileUpload, Heading, Text } from "@chakra-ui/react";
import type { ReactNode } from "react";
import { useState } from "react";
import { LuX } from "react-icons/lu";

interface Props {
  uploadType: "cv" | "jd";
  label: string;
  userId: string;
  onUploaded: (meta: {
    uploadId: string;
    storagePath: string;
    fileName: string;
  }) => void;
  onRemoved: () => void;
  uploadedFile?: {
    fileName: string;
    uploadId: string;
    storagePath: string;
  } | null;
  linkedinToggle?: ReactNode;
}

export function UploadCard({
  uploadType,
  label,
  userId,
  onUploaded,
  onRemoved,
  uploadedFile,
  linkedinToggle,
}: Props) {
  const [uploading, setUploading] = useState(false);

  async function handleFileChange(details: { acceptedFiles: File[] }) {
    const file = details.acceptedFiles[0];
    if (!file) return;

    const validation = validateFile(file);
    if (!validation.valid) {
      toaster.error({ title: "Invalid file", description: validation.error });
      return;
    }

    setUploading(true);
    try {
      const result = await uploadAndNotify(file, uploadType, userId);
      onUploaded({
        uploadId: result.uploadId,
        storagePath: result.storagePath,
        fileName: file.name,
      });
    } catch (e) {
      toaster.error({
        title: "Upload failed",
        description: e instanceof Error ? e.message : "Unknown error",
      });
    } finally {
      setUploading(false);
    }
  }

  function handleRemove() {
    onRemoved();
  }

  return (
    <Card.Root
      borderRadius="20px"
      borderWidth="1px"
      borderColor="gray.200"
      shadow="none"
    >
      <Card.Body px="5" py="3.5">
        <Box
          display="flex"
          alignItems="center"
          justifyContent="space-between"
          mb="8"
        >
          <Heading
            fontSize="16px"
            fontWeight="600"
            letterSpacing="-0.01em"
            lineHeight="100%"
            pl="1.5"
          >
            {label}
          </Heading>
          {linkedinToggle}
        </Box>

        {uploadedFile ? (
          <Box
            bg="rgba(245, 240, 230, 0.6)"
            borderRadius="16px"
            p="4"
            display="flex"
            alignItems="center"
            justifyContent="space-between"
          >
            <Text fontSize="14px" truncate flex="1" mr="2">
              {uploadedFile.fileName}
            </Text>
            <Button
              variant="ghost"
              size="xs"
              onClick={handleRemove}
              aria-label="Remove file"
              borderRadius="full"
              minW="auto"
              h="auto"
              p="1"
            >
              <LuX />
            </Button>
          </Box>
        ) : (
          <FileUpload.Root
            maxFiles={1}
            accept={["application/pdf", ".docx", "text/plain"]}
            maxFileSize={10 * 1024 * 1024}
            onFileChange={handleFileChange}
            disabled={uploading}
          >
            <FileUpload.HiddenInput />
            <FileUpload.Dropzone
              w="full"
              minH="32"
              bg="rgba(248, 248, 248, 1)"
              borderWidth="2px"
              borderStyle="dashed"
              borderColor="gray.300"
              borderRadius="16px"
              py="7"
              px="4"
              textAlign="center"
              cursor="pointer"
              display="flex"
              alignItems="center"
              justifyContent="center"
              _hover={{ borderColor: "blue.300" }}
            >
              <Text fontSize="14px" color="fg.muted">
                {uploading ? "Uploading..." : "Click to browse files"}
              </Text>
            </FileUpload.Dropzone>
          </FileUpload.Root>
        )}
      </Card.Body>
    </Card.Root>
  );
}
