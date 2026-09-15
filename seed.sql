-- =============================================================
-- Phase 2 — seed.sql
-- DEMO ENTRIES — NOT REAL INSTITUTIONAL POLICY
--
-- Replace the content with your own policy text before going
-- near production. Safe to re-run: explicit ids + ON DUPLICATE
-- KEY UPDATE. Re-running overwrites edits to these ten rows.
-- =============================================================

USE `support_agent`;

INSERT INTO `knowledge_base`
  (`id`, `title`, `content`, `keywords`, `category`, `is_active`)
VALUES

(1,
 'Course Registration and the Add/Drop Period',
 'Students register for courses through the Student Portal during the published registration window. Continuing students register in a priority window assigned by earned credits; new students register during orientation week. To add a course after the registration deadline, submit an Add Form signed by the instructor and the department chair to the Office of the Registrar within the first five business days of the term. To drop a course without a grade entry, submit a Drop Form before the end of the second week. Courses dropped after the add/drop window require a formal withdrawal request.',
 'registration, add drop, add form, drop form, course selection, enrollment, registrar, priority window',
 'registration', 1),

(2,
 'Tuition Payment Deadlines and Installment Plans',
 'Tuition and mandatory fees are due in full by the payment deadline published in the academic calendar, typically two weeks before the first day of classes. Accepted payment methods are online card payment through the Student Portal, bank transfer, and in-person payment at the Bursar. Students who cannot pay in full may enroll in the installment plan, which requires a 25 percent down payment and three equal monthly installments. A late fee of 2 percent applies to any balance outstanding after the deadline, and a financial hold is placed on accounts more than 30 days past due. Financial holds block registration, transcript release, and graduation clearance.',
 'tuition, fees, payment deadline, bursar, installment plan, late fee, financial hold, payment methods',
 'billing', 1),

(3,
 'Final Exam Schedule and Makeup Examinations',
 'The final examination schedule is published by the Office of the Registrar four weeks before the end of each term and is available in the Student Portal. Instructors may not reschedule a final examination without approval from the Dean. A student who misses a final examination because of documented illness, a family emergency, or a religious observance may request a makeup examination. Makeup requests must be submitted to the course instructor within five business days of the missed examination and must include supporting documentation. Approved makeup examinations are scheduled by the department within 30 days.',
 'exam schedule, final exam, makeup exam, missed exam, reschedule exam, dean approval, religious observance',
 'exams', 1),

(4,
 'Library Borrowing, Renewals, and Off-Campus Access',
 'Current students, faculty, and staff may borrow up to ten items at a time from the main library using a valid student ID card. Standard loan periods are 21 days for books and 3 days for reserve materials. Items may be renewed twice online through the library catalog unless another borrower has placed a hold. Overdue items accrue a fine per day per item, and borrowing privileges are suspended once unpaid fines exceed the threshold published on the library website. Interlibrary loan requests typically take five to ten business days. Electronic databases and journals are reachable off campus through the library proxy using your campus credentials.',
 'library, borrowing, loan period, renew books, overdue fine, interlibrary loan, reserve materials, database access',
 'library', 1),

(5,
 'Ordering an Official Transcript',
 'Official transcripts are issued by the Office of the Registrar. Current students and alumni may order transcripts online through the Student Portal, or in person with photo identification. Each official transcript carries a fee, and expedited shipping is available at additional cost. Transcript orders are processed within three to five business days; orders placed during the first two weeks of a term may take longer because of peak volume. Transcripts cannot be released while a financial hold or an unresolved disciplinary hold is on the account. Unofficial transcripts are available immediately at no cost through the Student Portal.',
 'transcript, official transcript, order transcript, records, registrar, financial hold, alumni, unofficial transcript',
 'records', 1),

(6,
 'Student Portal Password Reset and Locked Accounts',
 'If you cannot sign in to the Student Portal, use the Forgot Password link on the login page and enter your institutional email address. A reset link is sent within a few minutes; check your spam folder if it does not arrive. Reset links expire after 30 minutes. If your institutional email is also inaccessible, contact the IT Service Desk in person with photo identification or by phone during business hours so staff can verify your identity and reset the password manually. Accounts are locked for 15 minutes after five consecutive failed sign-in attempts.',
 'password reset, forgot password, locked account, cannot log in, student portal, login problem, IT service desk',
 'it-support', 1),

(7,
 'Campus WiFi and VPN Access',
 'Eduroam and the campus wireless network are available in all academic buildings, residence halls, and the library. Connect using your institutional username and password. Devices that do not support enterprise authentication, such as some game consoles and printers, must be registered through the device registration portal. Off-campus access to library databases and internal systems requires the campus VPN client, available for Windows, macOS, Linux, iOS, and Android. The VPN is not required for general web browsing. If you cannot connect, forget the network on your device and reconnect; contact the IT Service Desk if the problem continues.',
 'wifi, wireless, eduroam, vpn, network access, device registration, internet, cannot connect, off campus access',
 'it-support', 1),

(8,
 'Scholarships, Financial Aid, and Disbursement',
 'Merit scholarships are awarded at admission and renewed annually provided the recipient maintains the required cumulative grade point average and completes a full-time course load. Need-based financial aid requires a completed financial aid application each academic year, submitted before the published priority deadline. Students whose circumstances change may submit a special circumstances appeal to the Financial Aid Office with supporting documentation. Aid disbursements are applied to the student account after the add/drop period each term, and any remaining credit balance is refunded by direct deposit. Failure to maintain satisfactory academic progress may result in loss of aid eligibility.',
 'scholarship, financial aid, merit scholarship, need based aid, financial aid application, disbursement, refund, satisfactory academic progress',
 'financial-aid', 1),

(9,
 'Course Withdrawal and the Tuition Refund Schedule',
 'To withdraw from a single course after the add/drop period, submit a Course Withdrawal Form to the Office of the Registrar before the withdrawal deadline published in the academic calendar. A grade of W is recorded and does not affect the grade point average. Tuition refunds for withdrawals follow the published refund schedule: 100 percent before the first day of classes, 75 percent during the first week, 50 percent during the second week, and no refund after the third week. To withdraw from all courses, a student must complete a term withdrawal through the Dean of Students Office, which may include an exit interview.',
 'withdrawal, withdraw from course, W grade, refund schedule, tuition refund, term withdrawal, dean of students, exit interview',
 'registration', 1),

(10,
 'Graduation Application and Degree Clearance',
 'Students expecting to graduate must submit a graduation application through the Student Portal by the deadline published in the academic calendar, typically at the start of the final term. The Office of the Registrar then performs a degree audit to confirm that all program requirements are satisfied. Students with outstanding requirements are notified and may be permitted to complete them in the following term. All financial obligations must be settled and all library materials returned before a diploma is released. Diplomas are mailed approximately eight weeks after the end of the term; official transcripts noting the degree conferral are available sooner.',
 'graduation, graduation application, degree audit, diploma, commencement, clearance, conferral, outstanding requirements',
 'records', 1)

ON DUPLICATE KEY UPDATE
  `title`      = VALUES(`title`),
  `content`    = VALUES(`content`),
  `keywords`   = VALUES(`keywords`),
  `category`   = VALUES(`category`),
  `is_active`  = VALUES(`is_active`);
