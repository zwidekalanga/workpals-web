import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ImprovementsContent } from "@/components/report/improvements-content";
import type { FixPatch, MatchReportResponse } from "@/lib/api";

const mockMutate = vi.fn();

vi.mock("@/components/report/data/hooks/useMatchReport", () => ({
  default: vi.fn(() => ({ data: undefined })),
}));

vi.mock("@/components/report/data/hooks/useApplyFix", () => ({
  default: vi.fn(() => ({
    mutate: mockMutate,
    isPending: false,
    variables: undefined,
  })),
}));

vi.mock("@/components/ui/toaster", () => ({
  toaster: { error: vi.fn() },
}));

function Wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return (
    <QueryClientProvider client={queryClient}>
      <ChakraProvider value={defaultSystem}>{children}</ChakraProvider>
    </QueryClientProvider>
  );
}

const MOCK_PATCH: FixPatch = {
  section: "skills",
  section_label: "Skills match",
  original: "Python, Java",
  patched: "Add a Conversational Design section to Skills.",
  rationale: "The JD targets ChatBots and TOBi. The CV lacks NLP keywords.",
  diff_summary: "Critical Keyword Gap: Conversational Design.",
};

const MOCK_PATCH_2: FixPatch = {
  section: "experience",
  section_label: "Experience",
  original: "Modernise their digital ecosystem",
  patched: "Increased user engagement by 10% on VodaPay mini-apps.",
  rationale: "The BBD section lacks hard metrics.",
  diff_summary: "Quantification of VodaPay Impact.",
};

afterEach(() => {
  cleanup();
  mockMutate.mockClear();
});

describe("ImprovementsContent", () => {
  it("renders empty state when no patches", () => {
    render(<ImprovementsContent patches={[]} pipelineRunId="test-run" />, {
      wrapper: Wrapper,
    });

    expect(
      screen.getByText("No improvement strategies available."),
    ).toBeDefined();
  });

  it("renders Problem Detected and Recommended Fix for each patch", () => {
    render(
      <ImprovementsContent
        patches={[MOCK_PATCH, MOCK_PATCH_2]}
        pipelineRunId="test-run"
      />,
      { wrapper: Wrapper },
    );

    // Problem Detected headers
    const problemHeaders = screen.getAllByText("Problem Detected");
    expect(problemHeaders).toHaveLength(2);

    // Recommended Fix headers
    const fixHeaders = screen.getAllByText("Recommended Fix");
    expect(fixHeaders).toHaveLength(2);

    // Diff summary (italic problem title)
    expect(screen.getByText(MOCK_PATCH.diff_summary)).toBeDefined();
    expect(screen.getByText(MOCK_PATCH_2.diff_summary)).toBeDefined();

    // Rationale
    expect(screen.getByText(MOCK_PATCH.rationale)).toBeDefined();

    // Patched text (recommended fix)
    expect(screen.getByText(MOCK_PATCH.patched)).toBeDefined();

    // Impact label
    expect(screen.getByText("Skills match")).toBeDefined();
    expect(screen.getByText("Experience relevance")).toBeDefined();
  });

  it("renders Apply fix buttons for unapplied patches", () => {
    render(
      <ImprovementsContent patches={[MOCK_PATCH]} pipelineRunId="test-run" />,
      { wrapper: Wrapper },
    );

    expect(screen.getByText("Apply fix")).toBeDefined();
  });

  it("renders Applied button for applied patches", async () => {
    const { default: useMatchReport } =
      await import("@/components/report/data/hooks/useMatchReport");
    vi.mocked(useMatchReport).mockReturnValue({
      data: { applied_patches: [0] } as MatchReportResponse,
    } as ReturnType<typeof useMatchReport>);

    render(
      <ImprovementsContent patches={[MOCK_PATCH]} pipelineRunId="test-run" />,
      { wrapper: Wrapper },
    );

    expect(screen.getByText("Applied")).toBeDefined();

    // Reset mock
    vi.mocked(useMatchReport).mockReturnValue({
      data: undefined,
    } as ReturnType<typeof useMatchReport>);
  });

  it("calls mutation.mutate when Apply fix is clicked", () => {
    render(
      <ImprovementsContent patches={[MOCK_PATCH]} pipelineRunId="test-run" />,
      { wrapper: Wrapper },
    );

    fireEvent.click(screen.getByText("Apply fix"));

    expect(mockMutate).toHaveBeenCalledWith(
      0,
      expect.objectContaining({
        onError: expect.any(Function),
      }),
    );
  });
});
