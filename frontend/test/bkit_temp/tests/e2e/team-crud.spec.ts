import { expect, test } from "@playwright/test";

test("팀 CRUD 핵심 흐름", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "팀 운영 데이터 관리" })).toBeVisible();

  await page.getByLabel("팀 이름").fill("프론트엔드 팀");
  await page.getByLabel("담당자").fill("박지훈");
  await page.getByLabel("인원 수").fill("5");
  await page.getByLabel("설명").fill("사용자 화면 개발");
  await page.getByRole("button", { name: "팀 등록" }).click();

  await expect(page.getByRole("heading", { name: "프론트엔드 팀" })).toBeVisible();

  await page.getByLabel("검색").fill("프론트");
  await expect(page.getByRole("heading", { name: "프론트엔드 팀" })).toBeVisible();

  await page.getByRole("button", { name: "수정" }).first().click();
  await page.getByLabel("담당자").fill("최유진");
  await page.getByRole("button", { name: "수정 저장" }).click();
  await expect(page.getByText("최유진 담당")).toBeVisible();

  page.on("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "삭제" }).first().click();
  await expect(page.getByRole("heading", { name: "프론트엔드 팀" })).not.toBeVisible();
});
