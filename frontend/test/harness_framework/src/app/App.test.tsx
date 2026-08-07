import { render, screen } from '@testing-library/react';

import { App } from './App';

describe('App', () => {
  it('renders the initial Comment Lens input screen without requiring an API key', () => {
    render(<App />);

    expect(screen.getByRole('heading', { name: 'Comment Lens' })).toBeInTheDocument();
    expect(screen.getByLabelText('YouTube URL')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '분석하기' })).toBeInTheDocument();
    expect(screen.getByText('저장된 최근 리포트는 아직 없습니다.')).toBeInTheDocument();
  });
});
