import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import logo from "../../../assets/logo.png";
import PublicLayout from "../../../layouts/PublicLayout";
import { useTranslation } from "../../../i18n/useTranslation";

export default function JoinCuraBook() {
  const [selected, setSelected] = useState("");
  const navigate = useNavigate();
  const { t, isRTL } = useTranslation();

  const handleClick = (role, path) => {
    setSelected(role);
    navigate(path);
  };

  return (
    <PublicLayout>
      <div className="join-container" dir={isRTL ? "rtl" : "ltr"}>
        <div className="join-box">
          <div className="join-logo">
            <img src={logo} alt="CuraBook Logo" />
            <h1>CuraBook</h1>
          </div>
          <h2 className="join-title">{t('join.title')}</h2>
          <button
            className={`join-btn ${selected === "patient" ? "selected" : ""}`}
            onClick={() => handleClick("patient", "/signup")}
          >
            {t('join.asPatient')}
          </button>
          <button
            className={`join-btn ${selected === "doctor" ? "selected" : ""}`}
            onClick={() => handleClick("doctor", "/doctor-signup")}
          >
            {t('join.asDoctor')}
          </button>
          <button
            className={`join-btn ${selected === "hospital" ? "selected" : ""}`}
            onClick={() => handleClick("hospital", "/hospital-signup")}
          >
            {t('join.asHospital')}
          </button>
          <button
            className={`join-btn ${selected === "assistant" ? "selected" : ""}`}
            onClick={() => handleClick("assistant", "/assistant-signup")}
          >
            {t('join.asAssistant')}
          </button>
        </div>
      </div>
    </PublicLayout>
  );
}
