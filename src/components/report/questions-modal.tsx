"use client";

import type { HiringQuestion } from "@/lib/api";
import { QuestionsContent } from "@/components/report/questions-content";
import {
  CloseButton,
  DialogBackdrop,
  DialogBody,
  DialogContent,
  DialogHeader,
  DialogPositioner,
  DialogRoot,
  DialogTitle,
} from "@chakra-ui/react";

interface Props {
  open: boolean;
  onClose: () => void;
  questions: HiringQuestion[];
}

export function QuestionsModal({ open, onClose, questions }: Props) {
  return (
    <DialogRoot
      open={open}
      onOpenChange={(e) => !e.open && onClose()}
      placement="center"
    >
      <DialogBackdrop />
      <DialogPositioner>
        <DialogContent
          mx="4"
          maxW="2xl"
          p="0"
          borderRadius="2xl"
          maxH="85vh"
          overflow="hidden"
        >
          <DialogHeader
            p="6"
            pb="4"
            display="flex"
            flexDirection="row"
            alignItems="center"
            justifyContent="center"
            position="relative"
          >
            <DialogTitle
              fontFamily="var(--font-serif), serif"
              fontSize="24px"
              fontWeight="400"
              lineHeight="1"
              letterSpacing="-0.01em"
            >
              Interview questions
            </DialogTitle>
            <CloseButton
              position="absolute"
              top="5"
              right="5"
              onClick={onClose}
              size="sm"
            />
          </DialogHeader>
          <DialogBody px="6" pb="6" pt="0" overflowY="auto">
            <QuestionsContent questions={questions} />
          </DialogBody>
        </DialogContent>
      </DialogPositioner>
    </DialogRoot>
  );
}
