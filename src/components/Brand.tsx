import { Link } from 'react-router-dom';

export function Brand({ linked = true }: { linked?: boolean }) {
  const content = (
    <>
      <span className="brand-mark" aria-hidden="true">
        <svg viewBox="0 0 32 32" fill="none">
          <path
            d="M7 7h18v14H15l-6 5v-5H7V7Z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <path
            d="M13 12a3 3 0 0 1 6 0c0 2-3 2-3 4m0 2v.5"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      </span>
      <span>
        질문수리소<span className="brand-caption">QUESTION WORKSHOP</span>
      </span>
    </>
  );
  return linked ? (
    <Link to="/" className="brand" aria-label="질문수리소 처음으로">
      {content}
    </Link>
  ) : (
    <div className="brand">{content}</div>
  );
}
