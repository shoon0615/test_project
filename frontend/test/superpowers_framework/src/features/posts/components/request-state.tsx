export type RequestErrorProps = {
  message: string;
  onRetry: () => void;
};

export function RequestError({ message, onRetry }: RequestErrorProps) {
  return (
    <section className="status-panel status-panel--error" role="alert">
      <p>{message}</p>
      <button className="button" type="button" onClick={onRetry}>
        다시 시도
      </button>
    </section>
  );
}
