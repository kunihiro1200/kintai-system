// 勤怠サマリーメール送信API（Gmail API版）

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentStaff } from '@/lib/auth/helpers';
import { google } from 'googleapis';

/**
 * POST /api/attendance/send-summary-email
 * 勤怠サマリーをGmail API経由でメール送信
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
    const { startDate, endDate, summaries, recipientEmail, senderEmail, additionalMessage } = body;

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

    if (!senderEmail) {
      return NextResponse.json(
        { success: false, error: '送信元メールアドレスは必須です' },
        { status: 400 }
      );
    }

    // 送信元メールアドレスに対応するスタッフを取得
    const { data: senderStaffData, error: senderStaffError } = await supabase
      .from('staffs')
      .select('id, google_access_token, google_refresh_token')
      .eq('email', senderEmail)
      .single();

    console.log('送信元スタッフ検索:', {
      senderEmail,
      found: !!senderStaffData,
      hasAccessToken: !!senderStaffData?.google_access_token,
      hasRefreshToken: !!senderStaffData?.google_refresh_token,
      error: senderStaffError,
    });

    if (senderStaffError || !senderStaffData) {
      return NextResponse.json(
        { success: false, error: `送信元メールアドレス（${senderEmail}）のスタッフが見つかりません。` },
        { status: 404 }
      );
    }

    if (!senderStaffData.google_access_token || !senderStaffData.google_refresh_token) {
      return NextResponse.json(
        { 
          success: false, 
          error: `送信元メールアドレス（${senderEmail}）のGoogle連携が必要です。${senderEmail}でログインしてGoogle連携を設定してください。` 
        },
        { status: 401 }
      );
    }

    // OAuth2クライアントを設定
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );

    oauth2Client.setCredentials({
      access_token: senderStaffData.google_access_token,
      refresh_token: senderStaffData.google_refresh_token,
    });

    // Gmail APIクライアントを作成
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    // メール本文を生成
    const emailBody = generateEmailBody(startDate, endDate, summaries, additionalMessage);
    const subject = `勤怠サマリー（${startDate}〜${endDate}）`;

    // メールメッセージを作成（RFC 2822形式）
    const message = [
      `From: ${senderEmail}`,
      `To: ${recipientEmail}`,
      `Subject: =?UTF-8?B?${Buffer.from(subject).toString('base64')}?=`,
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset=UTF-8',
      'Content-Transfer-Encoding: base64',
      '',
      Buffer.from(emailBody).toString('base64'),
    ].join('\n');

    // Base64エンコード（URL-safe）
    const encodedMessage = Buffer.from(message)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    // Gmail APIでメール送信
    await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedMessage,
      },
    });

    // 送信履歴を保存
    const { error: insertError } = await supabase
      .from('email_history')
      .insert({
        sent_by_staff_id: senderStaffData.id,
        recipient_email: recipientEmail,
        subject: subject,
        start_date: startDate,
        end_date: endDate,
        email_content: {
          summaries: summaries,
          additionalMessage: additionalMessage || null,
        },
      });

    if (insertError) {
      console.error('送信履歴の保存エラー:', insertError);
      console.error('送信履歴の保存エラー詳細:', {
        code: insertError.code,
        message: insertError.message,
        details: insertError.details,
        hint: insertError.hint,
      });
      // メール送信は成功しているので、エラーにはしない
    } else {
      console.log('送信履歴を保存しました');
    }

    return NextResponse.json({
      success: true,
      message: 'メールを送信しました',
    });
  } catch (error: any) {
    console.error('メール送信エラー:', error);
    console.error('エラー詳細:', {
      message: error.message,
      code: error.code,
      response: error.response?.data,
      stack: error.stack,
    });
    
    // エラーメッセージを詳細化
    let errorMessage = 'メール送信に失敗しました';
    if (error.message?.includes('invalid_grant')) {
      errorMessage = 'Google認証の有効期限が切れています。再度ログインしてください。';
    } else if (error.message?.includes('insufficient')) {
      errorMessage = 'Gmail送信の権限がありません。Google連携を再設定してください。';
    } else if (error.message) {
      errorMessage = `メール送信に失敗しました: ${error.message}`;
    }

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * メール本文を生成
 */
function generateEmailBody(startDate: string, endDate: string, summaries: any[], additionalMessage?: string): string {
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
    .additional-message { background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #ffc107; white-space: pre-wrap; }
    .leave-dates { font-size: 0.9em; color: #7f8c8d; margin-top: 5px; }
    .holiday-staff { color: #27ae60; font-weight: bold; }
  </style>
</head>
<body>
  <h1>勤怠サマリー</h1>
  ${additionalMessage ? `<div class="additional-message">${additionalMessage}</div>` : ''}
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
        <th>総残業時間</th>
        <th>確定残業時間</th>
        <th>有給休暇</th>
      </tr>
    </thead>
    <tbody>
`;

  summaries.forEach((summary) => {
    const holidayStaffLabel = summary.is_holiday_staff 
      ? '<span class="holiday-staff">✓ 祝日対応</span>' 
      : '祝日対応なし';

    // 有給休暇の日付をフォーマット
    let paidLeaveDisplay = `${summary.paid_leave_count}日`;
    if (summary.paid_leave_dates && summary.paid_leave_dates.length > 0) {
      const formattedDates = summary.paid_leave_dates
        .map((date: string) => {
          const d = new Date(date);
          return `${d.getMonth() + 1}/${d.getDate()}`;
        })
        .join('、');
      paidLeaveDisplay += `<div class="leave-dates">${formattedDates}</div>`;
    }

    html += `
      <tr>
        <td><strong>${summary.staff_name}</strong><br><small>${summary.staff_email}</small></td>
        <td>${holidayStaffLabel}</td>
        <td>${summary.work_days}日</td>
        <td>${summary.total_overtime.toFixed(1)}時間</td>
        <td>${summary.confirmed_overtime.toFixed(1)}時間</td>
        <td>${paidLeaveDisplay}</td>
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
