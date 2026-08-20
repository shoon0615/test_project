import { expect, test } from "@playwright/test";

test("a visitor can create, read, update, and delete a post", async ({ page }) => {
  const title = `E2E 게시글 ${Date.now()}`;

  await page.goto("/");
  await page.getByRole("link", { name: "새 글 작성" }).click();
  await page.getByLabel("제목").fill(title);
  await page.getByLabel("작성자").fill("테스트 작성자");
  await page.getByLabel("내용").fill("처음 작성한 본문입니다.");
  await page.getByRole("button", { name: "게시글 등록" }).click();
  await expect(page.getByRole("heading", { name: title })).toBeVisible();

  await page.getByRole("link", { name: "수정" }).click();
  await page.getByLabel("내용").fill("수정한 본문입니다.");
  await page.getByRole("button", { name: "게시글 수정" }).click();
  await expect(page.getByText("수정한 본문입니다.")).toBeVisible();

  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "삭제" }).click();
  await expect(page).toHaveURL("/");
  await expect(page.getByRole("link", { name: "팀에 공유하는 안내" })).toBeVisible();
  await expect(page.getByRole("link", { name: title })).toHaveCount(0);
});
