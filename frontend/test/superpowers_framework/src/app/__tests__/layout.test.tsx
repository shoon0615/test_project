import { render, screen } from "@testing-library/react";
import RootLayout, { metadata } from "../layout";

it("exposes Korean board metadata and renders children", () => {
  render(
    <RootLayout>
      <main>게시판 본문</main>
    </RootLayout>,
  );

  expect(screen.getByText("게시판 본문")).toBeInTheDocument();
  expect(metadata.title).toBe("작은 게시판");
});
