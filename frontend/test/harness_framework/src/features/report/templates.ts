import type { FeedbackTopic } from '../../types/domain';

export const TOPIC_LABELS: Record<FeedbackTopic, string> = {
  content: '내용',
  delivery: '전달력',
  editing: '편집',
  audio: '음향',
  pace: '영상 속도',
  captions: '자막',
  correction: '정정',
  'follow-up': '후속 콘텐츠',
};

export const STRENGTH_TEMPLATES: Record<FeedbackTopic, { title: string; description: string }> = {
  content: {
    title: '내용이 긍정적으로 언급됨',
    description: '수집한 공개 댓글 기준으로 내용에 대한 긍정 반응이 반복되었습니다.',
  },
  delivery: {
    title: '전달력이 긍정적으로 언급됨',
    description: '수집한 공개 댓글 기준으로 설명과 전달 방식에 대한 긍정 반응이 반복되었습니다.',
  },
  editing: {
    title: '편집이 긍정적으로 언급됨',
    description: '수집한 공개 댓글 기준으로 편집에 대한 긍정 반응이 반복되었습니다.',
  },
  audio: {
    title: '음향이 긍정적으로 언급됨',
    description: '수집한 공개 댓글 기준으로 음향에 대한 긍정 반응이 반복되었습니다.',
  },
  pace: {
    title: '영상 속도가 긍정적으로 언급됨',
    description: '수집한 공개 댓글 기준으로 길이와 전개 속도에 대한 긍정 반응이 반복되었습니다.',
  },
  captions: {
    title: '자막이 긍정적으로 언급됨',
    description: '수집한 공개 댓글 기준으로 자막에 대한 긍정 반응이 반복되었습니다.',
  },
  correction: {
    title: '정정 대응이 긍정적으로 언급됨',
    description: '수집한 공개 댓글 기준으로 오류 정정과 정확성에 대한 긍정 반응이 반복되었습니다.',
  },
  'follow-up': {
    title: '후속 콘텐츠가 긍정적으로 언급됨',
    description: '수집한 공개 댓글 기준으로 이어지는 콘텐츠에 대한 긍정 반응이 반복되었습니다.',
  },
};

export const IMPROVEMENT_TEMPLATES: Record<FeedbackTopic, { title: string; description: string; action: string }> = {
  content: {
    title: '내용 보강 요청',
    description: '수집한 공개 댓글 기준으로 내용의 깊이와 예시에 대한 개선 요청이 반복되었습니다.',
    action: '영상 자체를 보지 않았으므로 단정하지 않고, 수집한 댓글 기준으로 예시와 근거 자료를 보강할 지점을 점검하세요.',
  },
  delivery: {
    title: '전달 방식 개선 요청',
    description: '수집한 공개 댓글 기준으로 설명 흐름과 이해도에 대한 개선 요청이 반복되었습니다.',
    action: '영상 자체를 보지 않았으므로 단정하지 않고, 수집한 댓글 기준으로 어려운 구간의 설명 순서와 용어를 점검하세요.',
  },
  editing: {
    title: '편집 개선 요청',
    description: '수집한 공개 댓글 기준으로 컷, 전환 또는 화면 구성에 대한 개선 요청이 반복되었습니다.',
    action: '영상 자체를 보지 않았으므로 단정하지 않고, 수집한 댓글 기준으로 전환이 산만한 구간과 정보 표시 방식을 점검하세요.',
  },
  audio: {
    title: '음향 개선 요청',
    description: '수집한 공개 댓글 기준으로 음질, 볼륨 또는 배경음에 대한 개선 요청이 반복되었습니다.',
    action: '영상 자체를 보지 않았으므로 단정하지 않고, 수집한 댓글 기준으로 마이크 볼륨과 배경음악 균형을 점검하세요.',
  },
  pace: {
    title: '영상 속도 개선 요청',
    description: '수집한 공개 댓글 기준으로 영상 길이와 전개 속도에 대한 개선 요청이 반복되었습니다.',
    action: '영상 자체를 보지 않았으므로 단정하지 않고, 수집한 댓글 기준으로 도입부 길이와 설명 템포를 점검하세요.',
  },
  captions: {
    title: '자막 개선 요청',
    description: '수집한 공개 댓글 기준으로 자막 추가, 가독성 또는 싱크에 대한 개선 요청이 반복되었습니다.',
    action: '영상 자체를 보지 않았으므로 단정하지 않고, 수집한 댓글 기준으로 자막 누락, 오타와 싱크를 점검하세요.',
  },
  correction: {
    title: '정정 요청',
    description: '수집한 공개 댓글 기준으로 오류 제보와 정정 요청이 반복되었습니다.',
    action: '영상 자체를 보지 않았으므로 단정하지 않고, 수집한 댓글 기준으로 제보된 항목을 원자료와 대조해 정정 여부를 확인하세요.',
  },
  'follow-up': {
    title: '후속 설명 요청',
    description: '수집한 공개 댓글 기준으로 후속 설명이나 추가 사례에 대한 요청이 반복되었습니다.',
    action: '영상 자체를 보지 않았으므로 단정하지 않고, 수집한 댓글 기준으로 후속 영상에서 이어 다룰 질문을 정리하세요.',
  },
};

export const CONTENT_IDEA_TEMPLATES: Record<FeedbackTopic, { title: string; description: string; action: string }> = {
  content: {
    title: '내용 보강 콘텐츠 요청',
    description: '수집한 공개 댓글 기준으로 더 깊은 설명이나 추가 예시 요청이 반복되었습니다.',
    action: '요청 댓글을 기준으로 보강할 하위 주제와 예시 중심의 후속 콘텐츠를 검토하세요.',
  },
  delivery: {
    title: '설명형 후속 콘텐츠 요청',
    description: '수집한 공개 댓글 기준으로 더 풀어서 설명해 달라는 요청이 반복되었습니다.',
    action: '요청 댓글을 기준으로 초심자용 설명이나 단계별 walkthrough 콘텐츠를 검토하세요.',
  },
  editing: {
    title: '편집 관련 후속 콘텐츠 요청',
    description: '수집한 공개 댓글 기준으로 편집 방식이나 팁에 대한 요청이 반복되었습니다.',
    action: '요청 댓글을 기준으로 편집 과정, 화면 구성 또는 전환 팁 콘텐츠를 검토하세요.',
  },
  audio: {
    title: '음향 관련 후속 콘텐츠 요청',
    description: '수집한 공개 댓글 기준으로 음향 설정이나 장비에 대한 요청이 반복되었습니다.',
    action: '요청 댓글을 기준으로 녹음 환경, 마이크 설정 또는 배경음 조절 콘텐츠를 검토하세요.',
  },
  pace: {
    title: '짧은 요약 콘텐츠 요청',
    description: '수집한 공개 댓글 기준으로 길이와 전개 방식에 대한 요청이 반복되었습니다.',
    action: '요청 댓글을 기준으로 핵심 요약판이나 더 천천히 설명하는 후속 콘텐츠를 검토하세요.',
  },
  captions: {
    title: '자막 보강 요청',
    description: '수집한 공개 댓글 기준으로 자막 추가나 수정 요청이 반복되었습니다.',
    action: '요청 댓글을 기준으로 자막 보강판이나 다국어 자막 제공 범위를 검토하세요.',
  },
  correction: {
    title: '정정 콘텐츠 요청',
    description: '수집한 공개 댓글 기준으로 오류 확인이나 정정 요청이 반복되었습니다.',
    action: '요청 댓글을 기준으로 정정 공지나 업데이트 콘텐츠가 필요한지 확인하세요.',
  },
  'follow-up': {
    title: '후속 콘텐츠 요청',
    description: '수집한 공개 댓글 기준으로 다음 편이나 이어지는 주제 요청이 반복되었습니다.',
    action: '요청 댓글을 기준으로 다음 편에서 다룰 주제 후보를 정리하세요.',
  },
};
