import { useState } from "react";
import {
  CARE_GRADE_OPTIONS,
  GENDER_OPTIONS,
  GUARDIAN_RELATION_OPTIONS,
  STATUS_OPTIONS
} from "../utils/consultationOptions";

const emptyForm = {
  residentName: "",
  birthYear: "",
  gender: GENDER_OPTIONS[0],
  condition: "",
  careGrade: CARE_GRADE_OPTIONS[CARE_GRADE_OPTIONS.length - 1],
  guardianName: "",
  guardianRelation: GUARDIAN_RELATION_OPTIONS[0],
  guardianPhone: "",
  region: "",
  status: STATUS_OPTIONS[0]
};

export default function ConsultationForm({ initial, onSubmit, onCancel }) {
  const [values, setValues] = useState({ ...emptyForm, ...initial });
  const [saving, setSaving] = useState(false);

  const set = (key) => (e) => setValues((v) => ({ ...v, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    // 상담 중에는 정보를 한 번에 다 알 수 없는 경우가 많아, 빈 칸이 있어도 저장할 수 있게 한다.
    setSaving(true);
    try {
      await onSubmit(values);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="consultation-form" onSubmit={handleSubmit}>
      <div className="form-section-title">수급자(입소예정자) 정보</div>
      <div className="form-row">
        <label className="form-field">
          <span>수급자 이름</span>
          <input type="text" value={values.residentName} onChange={set("residentName")} autoFocus />
        </label>
        <label className="form-field">
          <span>생년</span>
          <input
            type="text"
            inputMode="numeric"
            placeholder="예: 1948"
            value={values.birthYear}
            onChange={set("birthYear")}
          />
        </label>
      </div>
      <div className="form-row">
        <label className="form-field">
          <span>성별</span>
          <select value={values.gender} onChange={set("gender")}>
            {GENDER_OPTIONS.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </label>
        <label className="form-field">
          <span>장기요양등급</span>
          <select value={values.careGrade} onChange={set("careGrade")}>
            {CARE_GRADE_OPTIONS.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="form-field">
        <span>건강/거동 상태</span>
        <input
          type="text"
          placeholder="예: 뇌졸중 후유증, 휠체어 이동, 인지 저하 있음"
          value={values.condition}
          onChange={set("condition")}
        />
      </label>

      <div className="form-section-title">보호자 정보</div>
      <div className="form-row">
        <label className="form-field">
          <span>보호자 이름</span>
          <input type="text" value={values.guardianName} onChange={set("guardianName")} />
        </label>
        <label className="form-field">
          <span>보호자와의 관계</span>
          <select value={values.guardianRelation} onChange={set("guardianRelation")}>
            {GUARDIAN_RELATION_OPTIONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="form-row">
        <label className="form-field">
          <span>연락처</span>
          <input
            type="tel"
            placeholder="010-0000-0000"
            value={values.guardianPhone}
            onChange={set("guardianPhone")}
          />
        </label>
        <label className="form-field">
          <span>지역</span>
          <input type="text" placeholder="거주 지역" value={values.region} onChange={set("region")} />
        </label>
      </div>

      <div className="form-section-title">상담 진행상태</div>
      <label className="form-field">
        <span>진행상태</span>
        <select value={values.status} onChange={set("status")}>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </label>

      <div className="form-actions">
        <button type="button" className="btn btn--ghost" onClick={onCancel}>
          취소
        </button>
        <button type="submit" className="btn btn--primary" disabled={saving}>
          {saving ? "저장 중..." : "저장"}
        </button>
      </div>
    </form>
  );
}
