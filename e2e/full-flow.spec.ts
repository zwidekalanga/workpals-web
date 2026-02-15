import { test, expect, Page } from '@playwright/test'
import path from 'path'

const TEST_EMAIL = 'test@example.com'
const TEST_PASSWORD = 'testpassword123'

const JD_PATH = path.resolve('/Users/cnxumalo/Workspace/workpals/SE3 Nompilo.pdf')
const CV_PATH = path.resolve(
  '/Users/cnxumalo/Workspace/workpals/CyberPro Consulting cv of Cyril Mandla Nxumalo.pdf',
)

async function signIn(page: Page) {
  await page.goto('/?auth=sign-in')
  await page.waitForSelector('text=Welcome back', { timeout: 10_000 })
  await page.fill('input[type="email"]', TEST_EMAIL)
  await page.locator('input[placeholder="Enter your password"]').fill(TEST_PASSWORD)
  await page.locator('button[type="submit"]:has-text("Sign In")').click()
  await page.waitForURL('**/dashboard', { timeout: 15_000 })
  // Wait for profile to load and upload cards to mount
  await page.waitForSelector('[data-part="dropzone"]', { timeout: 10_000 })
  await page.waitForFunction(() => document.body.textContent?.includes('Plan'), { timeout: 10_000 })
}

/** Upload a file via Playwright CDP setInputFiles on the nth file input. */
async function uploadFile(page: Page, inputIndex: number, filePath: string) {
  await page.locator('input[type="file"]').nth(inputIndex).setInputFiles(filePath)
}

test.describe('Full Analysis Flow', () => {
  test('1. Landing page loads', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('link', { name: 'Workpals' }).first()).toBeVisible()
    await expect(
      page.getByRole('navigation').getByRole('button', { name: 'Sign in' }),
    ).toBeVisible()
  })

  test('2. Sign-in dialog opens', async ({ page }) => {
    await page.goto('/?auth=sign-in')
    await expect(page.getByText('Welcome back')).toBeVisible({ timeout: 10_000 })
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[placeholder="Enter your password"]')).toBeVisible()
  })

  test('3. Sign in and reach dashboard', async ({ page }) => {
    await signIn(page)
    await expect(page.getByText('Upload your job description')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByRole('heading', { name: 'Job Description' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'CV / Resume' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Start analysis' })).toBeVisible()
  })

  test('4. Start analysis button is disabled without uploads', async ({ page }) => {
    await signIn(page)
    await expect(page.getByRole('button', { name: 'Start analysis' })).toBeDisabled()
  })

  test('5. Upload JD file', async ({ page }) => {
    await signIn(page)

    // Should have 2 dropzones initially
    await expect(page.locator('[data-part="dropzone"]')).toHaveCount(2)

    // Upload JD
    await uploadFile(page, 0, JD_PATH)

    // Verify: "Remove file" button appears and dropzone count drops to 1
    await expect(page.locator('button[aria-label="Remove file"]')).toBeVisible({ timeout: 30_000 })
    await expect(page.locator('[data-part="dropzone"]')).toHaveCount(1)
  })

  test('6. Upload both files and enable Start', async ({ page }) => {
    await signIn(page)
    await expect(page.locator('[data-part="dropzone"]')).toHaveCount(2)

    // Upload JD
    await uploadFile(page, 0, JD_PATH)
    await expect(page.locator('button[aria-label="Remove file"]')).toBeVisible({ timeout: 30_000 })

    // Upload CV (now the only remaining file input)
    await uploadFile(page, 0, CV_PATH)
    await expect(page.locator('button[aria-label="Remove file"]')).toHaveCount(2, {
      timeout: 30_000,
    })

    // No more dropzones
    await expect(page.locator('[data-part="dropzone"]')).toHaveCount(0)

    // Start analysis button should be enabled
    await expect(page.getByRole('button', { name: 'Start analysis' })).toBeEnabled({
      timeout: 5_000,
    })
  })

  test('7. Full analysis pipeline completes and navigates to report', async ({ page }) => {
    test.setTimeout(180_000) // 3 min for full pipeline

    await signIn(page)
    await expect(page.locator('[data-part="dropzone"]')).toHaveCount(2)

    // Upload JD
    await uploadFile(page, 0, JD_PATH)
    await expect(page.locator('button[aria-label="Remove file"]')).toBeVisible({ timeout: 30_000 })

    // Upload CV
    await uploadFile(page, 0, CV_PATH)
    await expect(page.locator('button[aria-label="Remove file"]')).toHaveCount(2, {
      timeout: 30_000,
    })

    // Click Start analysis
    const startBtn = page.getByRole('button', { name: 'Start analysis' })
    await expect(startBtn).toBeEnabled({ timeout: 5_000 })
    await startBtn.click()

    // Should see pipeline progress view
    await expect(
      page
        .getByText(
          /Starting analysis|Reading job description|Reading your CV|Reviewing role|Analyzing your experience|Analysis complete/,
        )
        .first(),
    ).toBeVisible({ timeout: 30_000 })

    // Wait for completion — up to 2 minutes
    await expect(page.getByText(/Analysis complete|100%/).first()).toBeVisible({
      timeout: 120_000,
    })

    // After completion, should navigate to report page
    await page.waitForURL('**/report/**', { timeout: 15_000 })
    await expect(page.getByRole('heading', { name: 'Analysis Report' })).toBeVisible({
      timeout: 10_000,
    })
  })
})

test.describe('Report Viewing', () => {
  test('8. Reports list shows completed analyses', async ({ page }) => {
    await signIn(page)

    // Click the Reports tab
    await page.getByRole('tab', { name: 'Reports' }).click()

    // Wait for reports to load — should show at least one from previous runs
    await page.waitForTimeout(2_000) // allow API call to resolve
    const reportItems = page.locator('[data-testid="report-item"]')
    const noReportsMessage = page.getByText('No reports yet')

    // Either we have reports or the empty state
    const hasReports = (await reportItems.count()) > 0
    const isEmpty = await noReportsMessage.isVisible().catch(() => false)
    expect(hasReports || isEmpty).toBe(true)

    // If we have reports, clicking one should navigate to report page
    if (hasReports) {
      await reportItems.first().click()
      await page.waitForURL('**/report/**', { timeout: 10_000 })
      await expect(page.getByRole('heading', { name: 'Analysis Report' })).toBeVisible({
        timeout: 10_000,
      })
    }
  })

  test('9. Report page displays scores and insight cards', async ({ page }) => {
    await signIn(page)

    // Navigate to Reports tab and open first report
    await page.getByRole('tab', { name: 'Reports' }).click()
    await page.waitForTimeout(2_000)

    const reportItems = page.locator('[data-testid="report-item"]')
    const count = await reportItems.count()
    if (count === 0) {
      test.skip()
      return
    }

    await reportItems.first().click()
    await page.waitForURL('**/report/**', { timeout: 10_000 })

    // Should show overall score
    await expect(page.getByText('Overall Score')).toBeVisible({ timeout: 10_000 })

    // Should show category score bars
    await expect(page.getByText('Skills')).toBeVisible()
    await expect(page.getByText('Experience')).toBeVisible()

    // Should show insight cards
    await expect(page.getByText('Points of Strength')).toBeVisible()
    await expect(page.getByText('Improvement Strategies')).toBeVisible()
    await expect(page.getByText('Interview Questions')).toBeVisible()

    // Should show Download button
    await expect(page.getByRole('button', { name: /Download Optimized CV/ })).toBeVisible()
  })

  test('10. Improvement Strategies modal shows fixes', async ({ page }) => {
    await signIn(page)

    // Navigate to first report
    await page.getByRole('tab', { name: 'Reports' }).click()
    await page.waitForTimeout(2_000)

    const reportItems = page.locator('[data-testid="report-item"]')
    const count = await reportItems.count()
    if (count === 0) {
      test.skip()
      return
    }

    await reportItems.first().click()
    await page.waitForURL('**/report/**', { timeout: 10_000 })
    await expect(page.getByText('Improvement Strategies')).toBeVisible({ timeout: 10_000 })

    // Click the Improvement Strategies card
    await page.getByText('Improvement Strategies').click()

    // Modal should open
    const modal = page.locator('[role="dialog"]')
    await expect(modal).toBeVisible({ timeout: 5_000 })

    // Should show CV Fixes section or career strategy content
    const hasPatches = await page.getByText('CV Fixes').isVisible().catch(() => false)
    const hasQuickWins = await page.getByText('Quick Wins').isVisible().catch(() => false)
    const hasNoStrategies = await page
      .getByText('No improvement strategies available')
      .isVisible()
      .catch(() => false)

    // At least one of these should be true
    expect(hasPatches || hasQuickWins || hasNoStrategies).toBe(true)

    // If we have patches, verify the Apply Fix button exists
    if (hasPatches) {
      const applyButton = page.getByRole('button', { name: /Apply Fix|Applied/ }).first()
      await expect(applyButton).toBeVisible()

      // Test applying a fix
      const isAlreadyApplied = await page
        .getByRole('button', { name: 'Applied' })
        .first()
        .isVisible()
        .catch(() => false)

      if (!isAlreadyApplied) {
        // Click Apply Fix on first patch
        await page.getByRole('button', { name: 'Apply Fix' }).first().click()
        // Should toggle to "Applied" state (may take a moment for API call)
        await expect(
          page.getByRole('button', { name: /Applied/ }).first(),
        ).toBeVisible({ timeout: 10_000 })
      }
    }

    // Close modal
    await page.keyboard.press('Escape')
  })

  test('11. Points of Strength modal opens', async ({ page }) => {
    await signIn(page)

    // Navigate to first report
    await page.getByRole('tab', { name: 'Reports' }).click()
    await page.waitForTimeout(2_000)

    const reportItems = page.locator('[data-testid="report-item"]')
    const count = await reportItems.count()
    if (count === 0) {
      test.skip()
      return
    }

    await reportItems.first().click()
    await page.waitForURL('**/report/**', { timeout: 10_000 })

    // Click the Points of Strength card
    await page.getByText('Points of Strength').click()

    const modal = page.locator('[role="dialog"]')
    await expect(modal).toBeVisible({ timeout: 5_000 })
    await expect(page.getByText('Points of Strength').last()).toBeVisible()

    await page.keyboard.press('Escape')
  })

  test('12. Interview Questions modal opens', async ({ page }) => {
    await signIn(page)

    // Navigate to first report
    await page.getByRole('tab', { name: 'Reports' }).click()
    await page.waitForTimeout(2_000)

    const reportItems = page.locator('[data-testid="report-item"]')
    const count = await reportItems.count()
    if (count === 0) {
      test.skip()
      return
    }

    await reportItems.first().click()
    await page.waitForURL('**/report/**', { timeout: 10_000 })

    // Click Interview Questions card
    await page.getByText('Interview Questions').click()

    const modal = page.locator('[role="dialog"]')
    await expect(modal).toBeVisible({ timeout: 5_000 })
    await expect(page.getByText('Interview Questions').last()).toBeVisible()

    await page.keyboard.press('Escape')
  })
})
