# סקירת קוד — Security Agent

> נכתב על ידי Claude ב-2026-07-31, על בסיס סקירה של מצב הריפו הנוכחי (branch: `master`).

## תיאור הפרויקט

זהו **Security Agent** — פייפליין היברידי (דטרמיניסטי + LLM) לזיהוי חולשות אבטחה בקוד, עם התמחות בדפוסים האופייניים לקוד שנוצר ע"י כלי AI (Copilot/Cursor/Claude). הפרויקט ממופה ל-OWASP Top 10:2025, ונראה כמו פרויקט תחרות/קורס (יש מסמך ארכיטקטורה מפורט ותוכנית עבודה של 5-8 שבועות ב-`ארכיטקטורה_ותוכנית_עבודה_מעודכנת.md`).

**הרעיון המרכזי:** במקום LLM טהור שסורק קוד "מאפס" (שסובל מהזיות), יש שכבת קרקע דטרמיניסטית (Semgrep + SCA) שמייצרת ממצאים אמינים, וה-LLM מוסיף בדיוק את מה שכלים סטטיים לא יכולים: הקשר עסקי, שיפוט confidence, וזיהוי שרשראות תקיפה.

### ארכיטקטורת 5 השכבות (`core/orchestrator.py`)

| שכבה | קובץ | סטטוס |
|---|---|---|
| 1. Detection (Semgrep + pip-audit) | `detectors/semgrep_runner.py`, `detectors/sca_runner.py` | ✅ ממומש |
| 2. Confidence/Context Agent | `agents/confidence_agent.py` | ✅ ממומש |
| 3. AI-Pattern Agent (הבידול המרכזי) | `agents/ai_pattern_agent.py` | ⏳ שלד בלבד — `scan()` מחזיר `[]` |
| 4. Chain Correlator (networkx) | `agents/chain_correlator.py` | ⏳ שלד בלבד — לא בונה קשתות |
| 5. Remediation (stretch) | `remediation/patch_generator.py` | ⏳ שלד בלבד — `generate()` מחזיר `None` |

בנוסף: `dashboard/app.py` (Streamlit), `ci/github-action.yml` (GitHub Action ל-PR), `eval/benchmark.py` (precision/recall/F1 מול ground truth — גם הוא שלד), ו-`test_targets/ai-generated-crud-app/` — אפליקציית CRUD פגיעה בכוונה שנבנתה במיוחד לבדיקות, עם `ground_truth.csv` מדויק שכולל גם מקרה בדיקה ל-prompt injection נגד הסוכן עצמו.

נקודה שכדאי לציין: הפרויקט כולל **תיעוד הקשחה עצמית** יוצא דופן (`security/agent_hardening_notes.md` למיפוי ASI01-10, `security/llm_top10_notes.md` למיפוי LLM01-10) — כלומר לא רק "מה הסוכן מחפש בקוד אחרים" אלא גם "אילו סיכונים יש לסוכן *עצמו* כשהוא קורא קוד לא מהימן". יש גם hook ב-`.claude/settings.json`+`.claude/hooks/block-env-access.js` שחוסם מ-Claude Code עצמו גישה לקבצי `.env`.

## איך מריצים

```bash
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
export ANTHROPIC_API_KEY=sk-...     # ה-Confidence Agent קורא ל-API של Anthropic
python scan.py <path-to-target-repo> --out findings.json
streamlit run dashboard/app.py      # ואז מעלים את findings.json בדשבורד
```

דרוש גם `semgrep` ו-`pip-audit` מותקנים ונגישים ב-PATH (הריצה נכשלת בשקט ל-`[]` אם הם חסרים — ראו ממצא למטה).

---

## Code Review

### 🔴 באג פוטנציאלי — שם מודל לא תקין

ב-`agents/confidence_agent.py:14`:

```python
MODEL = "claude-opus-4-8"
```

זה לא מזהה מודל תקין של Anthropic (המשפחה הנוכחית היא Claude 5: `claude-opus-5`, `claude-sonnet-5`, `claude-fable-5`, `claude-haiku-4-5-20251001`). כרגע `_call_model` תופס `Exception` בצורה גורפת (`confidence_agent.py:83-90`), כך שהקריאה תיכשל בשקט על **כל** finding, עם `confidence_reasoning` שמכיל את שגיאת ה-API — הפייפליין ירוץ עד הסוף בלי לקרוס, אבל בלי annotation אמיתי בכלל. שווה לוודא מול קונסולת Anthropic מה מזהה המודל הנכון ולעדכן.

### 🟡 חוסר עקביות בסכימה — findings מעל 200 חסרים שדות

ב-`confidence_agent.py:51-58`, findings שמעבר ל-`MAX_FINDINGS_PER_RUN=200` נוספים ל-`annotated` **בלי** לעבור `_annotate_one` — כלומר חסרים להם `supporting_evidence`/`confidence`/וכו'. זה תקין כמנגנון הגנה מפני LLM10 (Unbounded Consumption), אבל כדאי לתייג אותם במפורש (למשל `"confidence": None, "confidence_reasoning": "skipped: over per-run cap"`) כדי שצרכנים במורד הזרם (דשבורד, eval) לא יצטרכו לנחש למה חסרים שדות.

### 🟡 פענוח פלט מודל שביר

ב-`confidence_agent.py:94-103` (`_parse_response`) — אם המודל מוסיף טקסט אחרי בלוק ה-JSON (נפוץ אצל LLMs שמוסיפים הסבר), `json.loads` ייכשל ואז ה-`except Exception` הכללי ב-`_call_model` יתפוס את זה כשגיאה. לא הרסני, אבל שווה `json.loads` על substring שמזוהה בין `{` ל-`}` התואם, לא רק פיצול לפי ```` ``` ````.

### 🟢 טיפול נכון ב-prompt injection

שני ה-system prompts (`confidence_agent.py:16-29`, `ai_pattern_agent.py:9-25`) מנחים במפורש להתייחס לקוד הנסרק כ-DATA ולא כהוראה, ולדווח על ניסיונות hijack כממצא נפרד — וזה בדיוק נבדק ב-`test_targets/ai-generated-crud-app/app.py:110-119` מול השורה המתאימה ב-`ground_truth.csv:16`. עיצוב מחושב וטוב.

### 🟡 פערים בין תיעוד למימוש בפועל

- `security/llm_top10_notes.md` אומר שיש למסך (mask) ערכי secrets לפני שהם נכתבים ל-`findings.json` — אבל `ai_pattern_agent.py` (שאמור לזהות `hardcoded_demo_credentials`) הוא עדיין שלד ריק, אז אין עדיין קוד שצריך את המיסוך הזה. כדאי לוודא שהמיסוך נכנס **יחד** עם המימוש של השכבה, לא אחריו.
- ה-README לא מזכיר לצרכן הסופי שקוד המקור נשלח ל-Anthropic API (פעולה עם השלכות פרטיות/קניין רוחני) — זה כבר מתועד כ-TODO ב-`llm_top10_notes.md` עצמו, שווה להעלות ל-README.
- `requirements.txt` משתמש ב-`>=` בלבד, לא נעול — גם זה כבר מתועד כפער ידוע (LLM03).

### 🟡 חוסר חוסן ב-CI

`ci/github-action.yml` מריץ את הסריקה אך לא עושה כלום עם `findings.json` (אין gate שנכשל על ממצאים קריטיים, אין post כ-PR comment) — זה TODO מוצהר בקובץ עצמו, לא באג.

### 🟢 מיפוי OWASP ב-Semgrep מוגבל אך תקין ל-MVP

`detectors/semgrep_runner.py:8-13` ממפה רק 4 קטגוריות (`sql-injection`, `command-injection`, `hardcoded-secret`, `cors`) לפי substring ב-`check_id`; כל השאר יסומנו `UNMAPPED`. עקבי עם השלב הנוכחי בתוכנית העבודה (שבוע 1), פשוט לזכור להרחיב את ה-`OWASP_MAP` בהמשך.

### 🟢 כישלון-שקט מכוון (by design)

גם `run_semgrep` וגם `_run_pip_audit` תופסים `FileNotFoundError`/`TimeoutExpired`/`JSONDecodeError` ומחזירים `[]` אם הכלים לא מותקנים — תואם לכוונה המוצהרת ("so the pipeline still runs end-to-end"), אבל שווה לפחות `print`/`log` אזהרה למשתמש כשזה קורה, אחרת סריקה "ריקה" כי semgrep לא הותקן נראית זהה לסריקה נקייה.

### 🟢 אפליקציית היעד לבדיקות — איכות גבוהה

`test_targets/ai-generated-crud-app/app.py` בנויה היטב כ-ground truth: כל חולשה מתועדת בקומנטרי בקוד וממופה שורה-מדויקת ל-CSV, כולל הזרקת prompt-injection מכוונת. דוגמה טובה לאיך בונים dataset עם שליטה מלאה על "אמת קרקע".

---

## סיכום

הפרויקט במצב MVP מתקדם ועקבי היטב עם מסמך הארכיטקטורה שלו — שכבות 1-2 עובדות, 3-5 הן שלדים מתועדים (TODO מפורש, לא קוד שבור). הבעיה הכי דחופה לתיקון בפועל היא שם המודל השגוי ב-`confidence_agent.py`, כי הוא הופך את "שכבה 2" ללא-פעילה כרגע גם כשה-API key תקין.
