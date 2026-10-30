import { renderToStaticMarkup } from "react-dom/server";
import RootLayout, { metadata } from "../layout";

it("exposes Korean board metadata and renders children", () => {
  const markup = renderToStaticMarkup(
    <RootLayout>
      <main>게시판 본문</main>
    </RootLayout>,
  );

  expect(markup).toContain('<html lang="ko">');
  expect(markup).toContain("<main>게시판 본문</main>");
  expect(metadata.title).toBe("작은 게시판");
});
