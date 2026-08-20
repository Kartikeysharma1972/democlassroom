# ClassroomAI Testing Checklist

**Version:** 2.0 (8 tools)
**Date:** June 2026
**Prepared for:** CodeVidhya QA Team

---

## Phase 1: Developer Testing (Self-QA)

**Who:** Developer (you)
**When:** Before sharing with anyone
**Duration:** 2-3 hours
**Goal:** Every core flow works end-to-end without crashing

### 1.1 Authentication

| # | Test Case | Steps | Expected | Pass/Fail |
|---|-----------|-------|----------|-----------|
| A-01 | Sign up new account | Enter name, email, password (6+ chars) > Create Account | Account created, redirect to dashboard | |
| A-02 | Password strength meter | Type 1 char, 4 chars, 6 chars, 8+ chars | Bar fills progressively (4 levels) | |
| A-03 | Sign up validation | Submit with empty name / short password | Red error message shown | |
| A-04 | Login existing account | Enter registered email + password > Sign In | Redirect to dashboard, user name in header | |
| A-05 | Login wrong password | Enter wrong password | Error: "Invalid credentials" (not crash) | |
| A-06 | Logout | Click user avatar > Sign Out | Redirect to login, token cleared | |
| A-07 | Auth persistence | Login > close tab > reopen same URL | Still logged in (token in localStorage) | |
| A-08 | Protected routes | Visit /vocabulary without login | Redirect to /login | |

### 1.2 Dashboard

| # | Test Case | Steps | Expected | Pass/Fail |
|---|-----------|-------|----------|-----------|
| D-01 | Dashboard loads | Login > land on /dashboard | Greeting with user name, 8 tool cards visible | |
| D-02 | Tool card navigation | Click each of the 8 tool cards | Navigates to correct route, header title updates | |
| D-03 | Sidebar navigation | Click each sidebar item | Navigates correctly, active indicator shows | |
| D-04 | Stats display | Check stats row | Shows "8 AI tools", "10h+", "K-12", "<30s" | |
| D-05 | AI Online indicator | Check header | Green dot + "AI Online" visible | |

### 1.3 Lesson Plan Generator

| # | Test Case | Steps | Expected | Pass/Fail |
|---|-----------|-------|----------|-----------|
| LP-01 | Full generation | Grade 10 > Physics > Newton's Laws > 45 min > Generate | Lesson plan output in <30s with sections | |
| LP-02 | Grade cascade | Select Grade 5 | Subject dropdown shows Grade 5 subjects | |
| LP-03 | Subject cascade | Select Grade 8 > Science | Topic dropdown shows Science topics | |
| LP-04 | Custom topic | Switch to "Type" tab > type custom topic | Accepts freeform text, generates with it | |
| LP-05 | Voice input | Click mic on topic > speak | Text appears in topic field | |
| LP-06 | File upload | Upload a PDF > Generate | Output references uploaded material content | |
| LP-07 | Enrich: activities | Generate > click "Add more activities" | 4-5 new activities appended to output | |
| LP-08 | Enrich: examples | Generate > click "Add more example questions" | Example questions appended | |
| LP-09 | Enrich: subtopics | Generate > click "Add more subtopics" | Subtopics appended | |
| LP-10 | Copy output | Generate > click Copy | Clipboard has the lesson plan text | |
| LP-11 | History load | Click History > select a past generation | Output restored from history | |
| LP-12 | Usage counter | Generate twice > check counter | Shows "2/50", increments correctly | |

### 1.4 Worksheet Generator

| # | Test Case | Steps | Expected | Pass/Fail |
|---|-----------|-------|----------|-----------|
| WS-01 | Mixed worksheet | Grade 6 > Math > Fractions > Mixed > 10 Qs > Generate | 10 mixed-type questions generated | |
| WS-02 | Fill in blank only | Select "Fill in the Blank" type > Generate | Only fill-in-blank questions | |
| WS-03 | MCQ only | Select "Multiple Choice" type > Generate | Only MCQ questions with options | |
| WS-04 | Q&A only | Select "Question & Answer" type > Generate | Only open-ended questions | |
| WS-05 | Question count slider | Slide to 3, then 25 | Number updates, generation matches count | |
| WS-06 | Additional instructions | Add "Include a word bank" > Generate | Word bank appears in output | |

### 1.5 Class Activity Generator

| # | Test Case | Steps | Expected | Pass/Fail |
|---|-----------|-------|----------|-----------|
| CA-01 | Group activity | Select "Group Activities" > 3 activities > 30 min > Generate | 3 group activities with materials and steps | |
| CA-02 | Multi-type select | Select Group + Hands-On + Games | Output has mix of activity types | |
| CA-03 | Bloom's level | Set to "Create" > Generate | Activities target Create level (higher-order) | |
| CA-04 | Group size | Set "Pairs" > Generate | Activities designed for partner work | |

### 1.6 Question Paper Generator

| # | Test Case | Steps | Expected | Pass/Fail |
|---|-----------|-------|----------|-----------|
| QP-01 | MCQ paper | Grade 10 > Science > 10 Qs > MCQ > Easy > Generate | Paper with 10 MCQs, marks, answer key | |
| QP-02 | Subjective paper | Same setup > Subjective > Generate | Paper with descriptive questions | |
| QP-03 | Mixed paper | Same setup > Mix > Generate | Both MCQ and subjective questions | |
| QP-04 | Edit question | Click Edit > modify Q1 text > Done | Changes saved in display | |
| QP-05 | Edit marks | Click Edit > change marks for Q3 > Done | Marks updated, total recalculated | |
| QP-06 | Delete question | Click Edit > delete Q5 | Q5 removed, remaining re-numbered | |
| QP-07 | PDF download | Generate > Download PDF | PDF opens with logo, questions, answer key | |
| QP-08 | School logo | Upload PNG logo > Generate > Download PDF | Logo appears in PDF header | |

### 1.7 Code Debugger

| # | Test Case | Steps | Expected | Pass/Fail |
|---|-----------|-------|----------|-----------|
| CD-01 | Sample code | Click Sample > Run Code | Shows error output (expected — sample has bugs) | |
| CD-02 | Fix code | After run error > click Fix My Code | Learn tab: bugs listed, Fixed tab: corrected code | |
| CD-03 | Apply fix | Click "Apply Fix" | Corrected code replaces textarea content | |
| CD-04 | Re-run after fix | Apply Fix > Run Code | "Code ran successfully" green message | |
| CD-05 | Simple explanation | Fix code > click "Simple Explanation" | Kid-friendly explanation in yellow box | |
| CD-06 | Download report | Fix code > Download Report | HTML report with bugs + fixes + code | |
| CD-07 | Clean code run | Paste valid Python `print("hello")` > Run | Green success: "Code ran successfully" | |
| CD-08 | File upload | Upload .py file | Code loaded in textarea, language auto-detected | |
| CD-09 | Language detect | Upload .js file | Language dropdown switches to JavaScript | |
| CD-10 | Paste button | Click Paste (with code on clipboard) | Code pasted into textarea | |
| CD-11 | Clear button | Type code > click Clear | Textarea emptied | |
| CD-12 | CS Tutor chat | Click floating button > type "What is a loop?" | AI response in chat bubble | |

### 1.8 Feedback Writer

| # | Test Case | Steps | Expected | Pass/Fail |
|---|-----------|-------|----------|-----------|
| FW-01 | Basic generation | Name: "Arjun" > Grade 8 > Academic > Rate 3 areas > Encouraging > Generate | Personalized feedback in <10s | |
| FW-02 | All tones | Generate with each tone (Encouraging, Constructive, Formal, Warm, Professional) | Tone matches selection in text | |
| FW-03 | All feedback types | Try each type (Academic, Behavior, Participation, etc.) | Content matches type | |
| FW-04 | Star rating | Rate 5 stars for Academic, 2 for Behavior | Report card shows 5/5 and 2/5 | |
| FW-05 | Edit feedback | Generate > click Edit > modify text > Done | Changes saved | |
| FW-06 | Copy feedback | Generate > click Copy | Shows "Copied" confirmation | |
| FW-07 | Download report | Generate > click Download Report | Print dialog with formatted report card | |
| FW-08 | Extra insight | Add context "Led science project brilliantly" > Generate | Context referenced in feedback | |
| FW-09 | Min rating required | Try Generate with 0 ratings | Validation error, generate disabled | |

### 1.9 Vocabulary Mastery

| # | Test Case | Steps | Expected | Pass/Fail |
|---|-----------|-------|----------|-----------|
| VM-01 | Basic generation | Grade 5 > Topic: "Weather" > Objective: "Learn weather terms" > Generate | 3-section worksheet (Matching, Fill-blank, Sentence) | |
| VM-02 | Stream status | Click Generate > watch button | Shows progress messages, not just "Generating..." | |
| VM-03 | Answer key toggle | Generate > click "Answer Key" | Answers shown in amber | |
| VM-04 | Student view toggle | Show answers > click "Student View" | Answers hidden, blanks shown | |
| VM-05 | Edit mode | Click Edit in sidebar > modify text > Done | Changes saved as HTML | |
| VM-06 | Copy worksheet | Click Export > Copy | Worksheet text on clipboard | |
| VM-07 | PDF export | Click Export > PDF | PDF downloaded with all sections | |
| VM-08 | DOCX export | Click Export > DOCX | .docx file downloaded | |
| VM-09 | History popup | Click History in sidebar | Popup shows past worksheets with search + date filter | |
| VM-10 | Load from history | History > click a past worksheet > Load | Worksheet restored in result view | |
| VM-11 | Adapt flow | Result > click Adapt > change grade > Generate | New worksheet with adapted settings | |
| VM-12 | Grade prefill on adapt | Generate Grade 5 > Adapt | Grade dropdown shows "5th Grade Students" (not blank) | |
| VM-13 | Website source | Form > Website tab > paste URL | Auto-fetches, Topic/Objective auto-filled | |
| VM-14 | YouTube source | Form > YouTube tab > paste video URL | Transcript loaded, fields auto-filled | |
| VM-15 | File upload source | Form > File tab > upload PDF | File indexed, Topic/Objective suggested | |
| VM-16 | Standards source | Form > Standards tab > paste curriculum text | Source loaded, fields auto-filled | |
| VM-17 | Content safety | Type profanity in topic > Generate | Red popup: "Content Not Allowed" | |
| VM-18 | Voice input | Click mic > speak topic > stop | Spoken text appears in topic field | |
| VM-19 | New tab | Result > click "+" or Create | Returns to empty form | |
| VM-20 | Close tab | Result > click X on tab | Tab removed, returns to form if last tab | |

### 1.10 Reading Comprehension

| # | Test Case | Steps | Expected | Pass/Fail |
|---|-----------|-------|----------|-----------|
| RC-01 | Basic generation | Grade 7 > "Photosynthesis" > Objective > Generate | 5-section output (Before Read, Annotation, Passage, Questions, Vocab) | |
| RC-02 | Stream status | Click Generate > watch button | Shows progress messages during SSE | |
| RC-03 | Answer key | Generate > click "Show Answer Key" | Answer hints shown, "Complete Answer" buttons appear | |
| RC-04 | Complete answer | Show answers > click "Complete Answer" on Q1 | AI-generated model answer in blue box | |
| RC-05 | Before You Read | Check output | "Before You Read" section with pre-reading questions | |
| RC-06 | Annotation Guide | Check output | Symbols list (star, arrow, circle, ?, !) | |
| RC-07 | Passage display | Check output | Multi-paragraph passage with topic content | |
| RC-08 | Question types | Check questions | Mixed literal/inferential/higher-order with type badges | |
| RC-09 | Vocabulary in Context | Check bottom section | Words from passage with context sentences + activities | |
| RC-10 | Edit mode | Click Edit > modify passage > Done | Changes saved | |
| RC-11 | PDF export | Export > PDF | Downloaded PDF with all sections | |
| RC-12 | DOCX export | Export > DOCX | .docx downloaded | |
| RC-13 | Tab switching | Generate > click different tab | Tab highlights correctly (not stuck on first) | |
| RC-14 | History | Click History > browse > Load | Past comprehension restored | |
| RC-15 | Content safety | Type blocked term > Generate | Red popup shown, generation blocked | |
| RC-16 | Source material | Website tab > paste URL > Generate | Passage based on source content | |

### 1.11 Cross-Tool Checks

| # | Test Case | Steps | Expected | Pass/Fail |
|---|-----------|-------|----------|-----------|
| X-01 | Usage tracking (Vocab) | Generate vocabulary worksheet | Usage counter increments | |
| X-02 | Usage tracking (Comp) | Generate comprehension | Usage counter increments | |
| X-03 | Chat history (Vocab) | Generate vocab > go to Dashboard > click History | Vocabulary generation appears in history | |
| X-04 | Chat history (Comp) | Generate comp > go to Dashboard > click History | Comprehension generation appears in history | |
| X-05 | Sidebar active state | Navigate to /vocabulary | "Vocabulary" highlighted in sidebar | |
| X-06 | Header title | Navigate to /comprehension | Header shows "Reading Comprehension" with subtitle | |
| X-07 | Back button | Vocab form > click "Back" | Returns to previous page | |
| X-08 | Generate bar position | Open Vocab form | Generate bar does NOT overlap sidebar | |

---

## Phase 2: Internal QA (2-3 Team Members)

**Who:** 2-3 developers or team members
**When:** After Phase 1 passes
**Duration:** 1-2 days
**Goal:** Edge cases, cross-browser, error handling

### 2.1 Edge Case Testing

| # | Test Case | Steps | Expected | Pass/Fail | Tester |
|---|-----------|-------|----------|-----------|--------|
| E-01 | Empty form submit | Click Generate with all fields empty | Validation error, no API call | | |
| E-02 | Very long topic | Paste 2000+ chars in topic | Truncated at 2000, no crash | | |
| E-03 | Special characters | Topic: `<script>alert('xss')</script>` | Escaped/sanitized, no XSS | | |
| E-04 | Unicode input | Topic: Hindi text "प्रकाश संश्लेषण" | Accepted, generation works | | |
| E-05 | Emoji in topic | Topic: "Animals 🐕🐈🐄" | Accepted or gracefully rejected | | |
| E-06 | Rapid double-click | Double-click Generate quickly | Only one request sent, no duplicate | | |
| E-07 | Generate during loading | Click Generate while already loading | Button disabled, no second request | | |
| E-08 | Network disconnect | Turn off WiFi > click Generate | Error message shown, no hang | | |
| E-09 | Backend down | Stop backend > click Generate | "Network error" or similar, no crash | | |
| E-10 | Slow network | Throttle to Slow 3G > Generate | Loading state visible, eventually completes | | |
| E-11 | Very large file upload | Upload 15MB PDF | Error: "File too large" or backend rejects | | |
| E-12 | Wrong file type | Upload .exe as "PDF" | Rejected by accept attribute or backend | | |
| E-13 | Invalid URL (Vocab) | Website tab > enter "not-a-url" | No fetch triggered (URL validation) | | |
| E-14 | 404 URL (Vocab) | Website tab > enter dead URL | "Could not fetch URL" error | | |
| E-15 | Private YouTube (Comp) | YouTube tab > paste private video URL | Graceful error message | | |
| E-16 | Concurrent generations | Open 2 tabs > Generate in both simultaneously | Both complete, no conflict | | |
| E-17 | Token expiry | Wait for auth token to expire > Generate | Redirect to login (not silent failure) | | |
| E-18 | Code debugger — empty code | Click Run/Fix with empty textarea | Disabled buttons or validation error | | |
| E-19 | Code debugger — huge code | Paste 5000+ lines > Fix | Handles gracefully (may truncate) | | |
| E-20 | Feedback — all 5 stars | Rate every area 5 stars > Generate | Positive feedback generated, not generic | | |
| E-21 | Feedback — all 1 star | Rate every area 1 star > Generate | Constructive feedback, not harsh | | |

### 2.2 Cross-Browser Testing

| # | Browser | Version | Test | Expected | Pass/Fail | Tester |
|---|---------|---------|------|----------|-----------|--------|
| B-01 | Chrome | Latest | Full login + generate in 3 tools | All work | | |
| B-02 | Firefox | Latest | Full login + generate in 3 tools | All work (voice input may differ) | | |
| B-03 | Edge | Latest | Full login + generate in 3 tools | All work including voice input | | |
| B-04 | Safari | Latest (Mac) | Full login + generate in 3 tools | All work (voice may not work) | | |
| B-05 | Chrome Mobile | Android | Dashboard + generate in 2 tools | Layout responsive, functional | | |
| B-06 | Safari Mobile | iOS | Dashboard + generate in 2 tools | Layout responsive, functional | | |

### 2.3 Error Recovery

| # | Test Case | Steps | Expected | Pass/Fail | Tester |
|---|-----------|-------|----------|-----------|--------|
| R-01 | Retry after error | Generate > get error > fix input > Generate again | Second attempt works | | |
| R-02 | Navigate away during load | Generate > click sidebar item before complete | Navigation works, no zombie request | | |
| R-03 | Browser back during result | Generate > press browser Back | Returns to form (not blank page) | | |
| R-04 | Refresh during result | Generate > press F5 | Page reloads, shows form (result lost — acceptable for prototype) | | |
| R-05 | Usage limit hit | Generate 50 times (or mock limit) | "Daily limit exceeded" message, button still works next day | | |

### 2.4 Visual & Layout

| # | Test Case | Steps | Expected | Pass/Fail | Tester |
|---|-----------|-------|----------|-----------|--------|
| V-01 | Sidebar overlap | Open any tool | Content does NOT go behind sidebar | | |
| V-02 | Header overlap | Open Vocab/Comp form | Back button and heading fully visible | | |
| V-03 | Generate bar | Open Vocab/Comp form | Generate bar starts after sidebar, not at left edge | | |
| V-04 | Scrolling (result) | Generate long Vocab worksheet | Single scrollbar, no double scroll | | |
| V-05 | Toast visibility | Copy in Vocab result | Toast shows readable text (not "[object Object]") | | |
| V-06 | Spinner size | Generate in Vocab form | Small spinner (18px) next to text, not huge 40px | | |
| V-07 | Existing tool styles | Open Lesson Planner, Worksheet, Question Paper | No CSS regressions (buttons, cards, fonts look normal) | | |
| V-08 | Mobile sidebar | Resize to 720px wide | Sidebar collapses or hides | | |
| V-09 | Print report | Feedback > Download Report | Print preview looks formatted (not raw HTML) | | |

---

## Phase 3: User Acceptance Testing (UAT) — 5-10 Teachers

**Who:** 5-10 real teachers (not developers)
**When:** After Phase 2 passes, app deployed on EC2
**Duration:** 1 week
**Goal:** Real-world usability, content quality, teacher satisfaction

### 3.1 Setup for UAT

1. Deploy on EC2 with accessible URL
2. Create 10 test accounts (or let teachers register)
3. Share a Google Form for feedback collection
4. Give teachers this task sheet (below)
5. Collect feedback after 1 week

### 3.2 Teacher Task Sheet

Give each teacher these 8 tasks. They should complete them independently without developer help.

---

**Task 1: Create a Lesson Plan**
- Go to Lesson Planner
- Create a lesson plan for your actual class (your real grade, subject, topic)
- Duration: whatever you normally teach
- Rate the output: Is it usable? What would you change?

**Task 2: Generate a Worksheet**
- Go to Worksheet Generator
- Create a worksheet for a topic you're currently teaching
- Try "Mixed" type with 10 questions
- Would you print this and give to students? Why or why not?

**Task 3: Design a Class Activity**
- Go to Class Activities
- Select 2 activity types that suit your teaching style
- Generate 3 activities for a topic you're teaching this week
- Are the activities practical for your classroom? (space, materials, time)

**Task 4: Create a Question Paper**
- Go to Question Paper
- Create a 10-question paper for an upcoming test
- Download the PDF
- Is the format acceptable for your school? Would you use this?

**Task 5: Debug Student Code**
- Go to Code Debugger
- Click "Sample" to load buggy code
- Click "Run Code" then "Fix My Code"
- Read the explanation — is it clear enough for your students?
- Try the "Simple Explanation" — would a Grade 6 student understand it?

**Task 6: Write Student Feedback**
- Go to Feedback Writer
- Enter a real student's name (or fake name)
- Rate them in at least 4 areas
- Pick a tone that matches your style
- Download the report card — would you send this to parents?

**Task 7: Create a Vocabulary Worksheet**
- Go to Vocabulary Mastery
- Pick a topic you're teaching, select the correct grade
- Try uploading a file OR pasting a website URL as source material
- Generate the worksheet
- Check: Are the words grade-appropriate? Are definitions accurate?

**Task 8: Create a Reading Comprehension**
- Go to Reading Comprehension
- Same topic/grade as above
- Generate the passage + questions
- Check: Is the passage length appropriate? Are questions meaningful?
- Try "Show Answer Key" and "Complete Answer" on one question

---

### 3.3 UAT Feedback Form (Google Form Questions)

**Section 1: Overall Experience**

1. How easy was it to sign up and get started? (1-5 scale)
2. How intuitive was the navigation (sidebar, dashboard)? (1-5 scale)
3. Did you encounter any errors or crashes? (Yes/No + describe)
4. What device/browser did you use?

**Section 2: Per-Tool Rating**

For each of the 8 tools, ask:
1. Were you able to complete the task without help? (Yes / Needed help / Could not complete)
2. Quality of AI output (1-5): Was it accurate and grade-appropriate?
3. Speed (1-5): Was the generation fast enough?
4. Usefulness (1-5): Would you use this in your actual teaching?
5. What would you improve about this tool? (open text)

**Section 3: Content Quality**

1. Was the content appropriate for the grade level you selected? (Yes / Too easy / Too hard)
2. Did you find any factual errors in the AI output? (Yes/No + describe)
3. Was the language and vocabulary suitable for Indian classrooms? (Yes/No + describe)
4. Did the content align with CBSE/NCERT curriculum? (Yes / Partially / No)

**Section 4: Suggestions**

1. Which tool did you find MOST useful? (dropdown of 8)
2. Which tool did you find LEAST useful? (dropdown of 8)
3. What feature is MISSING that you wish existed? (open text)
4. Would you recommend this to a colleague? (1-10 NPS scale)
5. Any other feedback? (open text)

---

## Phase 4: Performance Testing (Pre-Production)

**Who:** Developer with load testing tools
**When:** Before going live
**Duration:** 1 day

### 4.1 Load Tests

| # | Test | Tool | Setup | Expected | Result |
|---|------|------|-------|----------|--------|
| P-01 | 5 concurrent users | k6 or Artillery | 5 virtual users, each generating every 30s | All complete in <60s | |
| P-02 | 10 concurrent users | k6 or Artillery | 10 virtual users generating | Queue at Groq, all complete in <120s | |
| P-03 | 20 concurrent users | k6 or Artillery | 20 virtual users | Some may timeout, server stays up | |
| P-04 | Sustained 1hr | k6 | 5 users for 60 minutes | No memory leak, no crash | |
| P-05 | Large file upload | curl | Upload 10MB PDF to /api/vocabulary/rag/add-file | Completes or rejects cleanly | |
| P-06 | SSE streaming | Browser | Generate Vocab, check devtools Network tab | Events arrive progressively, connection closes cleanly | |
| P-07 | Database size | SQLite | Generate 500 worksheets | DB queries still fast (<100ms) | |

### 4.2 Response Time Benchmarks

| Endpoint | Acceptable | Slow | Unacceptable |
|----------|-----------|------|-------------|
| Login/Register | <1s | 1-3s | >3s |
| Dashboard load | <2s | 2-5s | >5s |
| Lesson Plan generate | <20s | 20-40s | >40s |
| Worksheet generate | <15s | 15-30s | >30s |
| Vocab/Comp generate (SSE) | <30s | 30-60s | >60s |
| Code Run | <10s | 10-20s | >20s |
| Code Debug/Fix | <20s | 20-40s | >40s |
| Feedback generate | <10s | 10-20s | >20s |
| File upload + index | <5s | 5-15s | >15s |
| URL extraction | <8s | 8-15s | >15s |
| PDF export | <3s | 3-8s | >8s |

---

## Phase 5: Security Audit (Pre-Production)

**Who:** Developer or security reviewer
**When:** Before public launch
**Duration:** 1 day

### 5.1 OWASP Top 10 Checks

| # | Vulnerability | Test | Expected | Pass/Fail |
|---|-------------|------|----------|-----------|
| S-01 | XSS (Stored) | Enter `<img src=x onerror=alert(1)>` in topic, check if it executes in output | Sanitized by DOMPurify, no execution | |
| S-02 | XSS (Reflected) | Put script tag in URL params | No execution | |
| S-03 | SQL Injection | Enter `'; DROP TABLE users;--` in login email | No effect, parameterized queries | |
| S-04 | SSRF | Enter `http://169.254.169.254/latest/meta-data/` in Website URL tab | Blocked by assert_public_url() | |
| S-05 | File upload exploit | Upload .php or .exe renamed to .pdf | Rejected or not executed | |
| S-06 | Auth bypass | Call /api/worksheet without auth token | Returns 401 or processes without user data | |
| S-07 | Rate limiting | Send 50 requests to /api/vocabulary/generate in 1 minute | Rate limited after 15 (429 response) | |
| S-08 | CORS | Call API from random domain (curl -H "Origin: evil.com") | Rejected (not in allowed origins) | |
| S-09 | API key exposure | Check git history, frontend bundle, network tab | No API keys visible anywhere | |
| S-10 | Password storage | Check backend auth.py | Passwords hashed with bcrypt (not plaintext) | |
| S-11 | Content injection | Enter offensive content | Blocked by frontend regex + backend validation | |
| S-12 | Large payload DoS | Send 50MB JSON body to /api/vocabulary/generate | Rejected by Nginx client_max_body_size or backend | |

---

## Tracking Template

### Bug Report Format

When filing bugs during any phase, use this format:

```
Bug ID: [PHASE]-[NUMBER] (e.g., P1-003)
Severity: Critical / High / Medium / Low
Tool: Lesson Plan / Worksheet / Vocab / etc.
Browser: Chrome 126 / Firefox / etc.
Steps to Reproduce:
  1. ...
  2. ...
  3. ...
Expected: ...
Actual: ...
Screenshot: [attach]
```

### Phase Sign-Off

| Phase | Start Date | End Date | Pass Rate | Sign-Off By |
|-------|-----------|----------|-----------|-------------|
| Phase 1: Developer QA | | | ___ / 100 | |
| Phase 2: Internal QA | | | ___ / 47 | |
| Phase 3: UAT (Teachers) | | | Avg rating: __/5 | |
| Phase 4: Performance | | | ___ / 7 | |
| Phase 5: Security | | | ___ / 12 | |
