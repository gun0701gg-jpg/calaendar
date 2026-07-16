// withon 로고 (A - 기본형 라이트) : 심볼 + 워드마크 + 캡션
export default function BrandMark({ size = "md" }) {
  return (
    <div className={`brand-mark brand-mark--${size}`}>
      <img className="brand-symbol" src="/logo-symbol.png" alt="withon 심볼" />
      <div className="brand-wordblock">
        <div className="brand-word">
          <span className="brand-word-with">with</span>
          <span className="brand-word-on">on</span>
        </div>
        <div className="brand-caption">BEYOND CARE · 위드온</div>
      </div>
    </div>
  );
}
