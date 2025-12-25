// 勤怠サマリーメール送信API

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentStaff } from '@/lib/auth/helpers';

/**
 * POST /api/attendance/send-summary-email
 * 勤怠サマリーをメールで送信
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // 認証チェック
    const currentStaff = await getCurrentStaff();
    if (!currentStaff) {
      return NextResponse.json(
        { success: false, error: '認証が必要です' },
        { status: 401 }
      );
    }

    // リクエストボディを取得
    const body = await request.json();
    const { startDate, endDate, summaries, recipientEmail } = body;

    // バリデーション
    if (!startDate || !endDate) {
      return NextResponse.json(
        { success: false, error: '開始日と終了日は必須です' },
        { status: 400 }
      );
    }

    if (!summaries || !Array.isArray(summaries)) {
      return NextResponse.json(
        { success: false, error: 'サマリーデータが不正です' },
        { status: 400 }
      );
    }

    if (!recipientEmail) {
      return NextResponse.json(
        { success: false, error: '送信先メールアドレスは必須です' },
        { status: 400 }
      );
    }

    // メール本文を生成
    const emailBody = generateEmailBody(startDate, endDate, summaries);
    const subject = `勤怠サマリー（${startDate}〜${endDate}）`;

    // Resend APIを使用してメール送信
    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      console.error('RESEND_API_KEY が設定されていません');
      return NextResponse.json(
        { success: false, error: 'メール送信の設定が完了していません' },
        { status: 500 }
      );
    }

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: '勤怠管理システム <tenant@ifoo-oita.com>',
        to: [recipientEmail],
        subject: subject,
        html: emailBody,
      }),
    });

    if (!resendResponse.ok) {
      const errorData = await resendResponse.json();
      console.error('Resend API エラー:', errorData);
      return NextResponse.json(
        { success: false, error: 'メール送信に失敗しました' },
        { status: 500 }
      );
    }

    // 送信履歴を保存
    const { error: insertError } = await supabase
      .from('email_history')
      .insert({
        sent_by_staff_id: currentStaff.id,
        recipient_email: recipientEmail,
        subject: subject,
        start_date: startDate,
        end_date: endDate,
      });

    if (insertError) {
      console.error('送信履歴の保存エラー:', insertError);
      // メール送信は成功しているので、エラーにはしない
    }

    return NextResponse.json({
      success: true,
      message: 'メールを送信しました',
    });
  } catch (error: any) {
    console.error('メール送信エラー:', error);
    return NextResponse.json(
      { success: false, error: 'メール送信に失敗しました' },
      { status: 500 }
    );
  }
}

/**
 * メール本文を生成
 */
function generateEmailBody(startDate: string, endDate: string, summaries: any[]): string {
  let html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    h1 { color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px; }
    h2 { color: #34495e; margin-top: 30px; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th { background-color: #3498db; color: white; padding: 12px; text-align: left; }
    td { padding: 10px; border-bottom: 1px solid #ddd; }
    tr:hover { background-color: #f5f5f5; }
    .summary { background-color: #ecf0f1; padding: 15px; border-radius: 5px; margin: 20px 0; }
    .leave-dates { font-size: 0.9em; color: #7f8c8d; margin-top: 5px; }
    .holiday-staff { color: #27ae60; font-weight: bold; }
  </style>
</head>
<body>
  <h1>勤怠サマリー</h1>
  <div class="summary">
    <p><strong>期間:</strong> ${startDate} 〜 ${endDate}</p>
    <p><strong>対象:</strong> 全社員 ${summaries.length}名</p>
  </div>

  <h2>勤怠一覧</h2>
  <table>
    <thead>
      <tr>
        <th>社員名</th>
        <th>祝日対応</th>
        <th>出勤日数</th>
        <th>総労働時間</th>
        <th>総残業時間</th>
        <th>有給休暇</th>
        <th>代休</th>
        <th>休日出勤</th>
      </tr>
    </thead>
    <tbody>
`;

  summaries.forEach((summary) => {
    const holidayStaffLabel = summary.is_holiday_staff 
      ? '<span class="holiday-staff">✓ 祝日対応</span>' 
      : '祝日対応なし';

    html += `
      <tr>
        <td><strong>${summary.staff_name}</strong><br><small>${summary.staff_email}</small></td>
        <td>${holidayStaffLabel}</td>
        <td>${summary.work_days}日</td>
        <td>${summary.total_work_hours.toFixed(1)}時間</td>
        <td>${summary.total_overtime.toFixed(1)}時間</td>
        <td>${summary.paid_leave_count}日</td>
        <td>${summary.compensatory_leave_count}日</td>
        <td>${summary.holiday_work_count}日</td>
      </tr>
    `;
  });

  html += `
    </tbody>
  </table>

  <div class="summary">
    <p><small>このメールは勤怠管理システムから自動送信されています。</small></p>
  </div>
</body>
</html>
`;

  return html;
}
