# 게시판

회원 없이 글을 쓰고, 읽고, 수정하고, 삭제하는 사용자용(FO) 게시판입니다.

## 바로 실행

Node.js 22가 설치된 터미널에서 저장소 루트를 기준으로 실행합니다. 패키지 설치는 필요 없습니다.

```bash
cd side/board
node server.mjs
```

터미널에 주소가 뜨면 [localhost:3000](http://localhost:3000)을 열고 **글쓰기 → 저장 → 수정 → 삭제**를 눌러 보세요. 서버를 종료하려면 `Ctrl+C`를 누릅니다.

**Docker 개발 컨테이너를 사용한다면** 두 번째 명령을 `HOST=0.0.0.0 node server.mjs`로 실행하세요. 이미 게시판 서버를 켜 둔 터미널이 있다면 먼저 그 터미널에서 `Ctrl+C`를 눌러 종료하세요. 원격 VS Code에서는 **Ports** 탭에서 3000번을 전달하고 **Open in Browser**를 누르세요.

**내 컴퓨터에서 3000번을 다른 앱이 쓰고 있다면** `PORT=3001 node server.mjs`로 실행하고 출력된 주소를 엽니다.

## 코드 지도

| 위치 | 하는 일 |
| --- | --- |
| [public/](public/) | HTML·CSS로 화면을 만들고 JavaScript로 API 호출 |
| [server.mjs](server.mjs) | Node.js로 요청을 받고 글을 메모리에 저장 |

**새로고침하면 글이 사라지나요?** 서버가 켜져 있으면 글이 남습니다. 서버를 껐다 켜면 목록이 비워집니다.

[진행 기록과 학습 노트](docs/notes.md)
