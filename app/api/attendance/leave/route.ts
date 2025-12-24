// 休暇記録API

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentStaff } from '@/lib/auth/helpers';
import { LeaveType, HalfLeavePeriod } from '@/types/database';
import { GoogleCalendarService } from '@/lib/services/GoogleCalendarService';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // 認証チェック
    const staff = await getCurrentStaff();

    // リクエストボディから休暇タイプ、日付、半休時間帯を取得
    const body = await request.json();
    const { leaveType, date, halfLeavePeriod } = body as { 
      leaveType: LeaveType; 
      date?: string;
      halfLeavePeriod?: HalfLeavePeriod;
    };

    if (!leaveType || leaveType === 'normal') {
      return NextResponse.json(
        { success: false, error: { message: '無効な休暇タイプです' } },
        { status: 400 }
      );
    }

    // 半休の場合は時間帯が必須
    if (leaveType === 'half_leave' && !halfLeavePeriod) {
      return NextResponse.json(
        { success: false, error: { message: '半休の場合は時間帯（午前/午後）を指定してください' } },
        { status: 400 }
      );
    }

    // 日付が指定されていない場合は今日
    const targetDate = date || new Date().toISOString().split('T')[0];

    // 既にその日の記録があるかチェック
    const { data: existingRecord } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('staff_id', staff.id)
      .eq('date', targetDate)
      .single();

    // 休日出勤の場合は既存の記録を更新、それ以外は新規作成
    let record;
    let error;

    if (existingRecord && leaveType === 'holiday_work') {
      // 休日出勤の場合：既存の記録を休日出勤に変換
      const { data, error: updateError } = await supabase
        .from('attendance_records')
        .update({
          leave_type: leaveType,
        })
        .eq('id', existingRecord.id)
        .select()
        .single();
      
      record = data;
      error = updateError;
    } else if (existingRecord) {
      // その他の休暇の場合：既に記録があればエラー
      return NextResponse.json(
        { success: false, error: { message: 'その日は既に記録があります' } },
        { status: 400 }
      );
    } else {
      // 記録がない場合：新規作成
      const { data, error: insertError } = await supabase
        .from('attendance_records')
        .insert({
          staff_id: staff.id,
          date: targetDate,
          leave_type: leaveType,
          half_leave_period: leaveType === 'half_leave' ? halfLeavePeriod : null,
          clock_in: null,
          clock_out: null,
          work_hours: null,
          overtime: null,
        })
        .select()
        .single();
      
      record = data;
      error = insertError;
    }

    if (error) {
      console.error('休暇記録エラー:', error);
      return NextResponse.json(
        { success: false, error: { message: '休暇の記録に失敗しました' } },
        { status: 500 }
      );
    }

    // Googleカレンダーにイベントを作成（連携されている場合のみ）
    let calendarEventId: string | null = null;
    try {
      console.log('カレンダーイベント作成を開始...');
      const calendarService = new GoogleCalendarService();
      const isConnected = await calendarService.isCalendarConnected(supabase, staff.id);
      console.log('カレンダー連携状態:', isConnected);

      if (isConnected) {
        // 休暇タイプに応じたタイトルを設定（システムから作成されたことを示すプレフィックス付き）
        let eventTitle = '';
        switch (leaveType) {
          case 'paid_leave':
            eventTitle = '[勤怠] 有給休暇';
            break;
          case 'special_leave':
            eventTitle = '[勤怠] 特別休暇';
            break;
          case 'half_leave':
            eventTitle = halfLeavePeriod === 'morning' ? '[勤怠] 半休（午前）' : '[勤怠] 半休（午後）';
            break;
          case 'holiday_work':
            eventTitle = '[勤怠] 休日出勤';
            break;
          default:
            eventTitle = '[勤怠] 休暇';
        }

        console.log('カレンダーイベントを作成:', { eventTitle, date: targetDate });
        
        // カレンダーイベントを作成
        const result = await calendarService.createCalendarEvent(supabase, staff.id, {
          summary: eventTitle,
          date: targetDate,
        });
        
        console.log('カレンダーイベント作成成功:', result);
        calendarEventId = result.id || null;

        // イベントIDをデータベースに保存
        if (calendarEventId && record) {
          await supabase
            .from('attendance_records')
            .update({ google_calendar_event_id: calendarEventId })
            .eq('id', record.id);
        }
      } else {
        console.log('カレンダー未連携のため、イベント作成をスキップ');
      }
    } catch (calendarError) {
      // カレンダーイベント作成に失敗しても、休暇記録自体は成功とする
      console.error('カレンダーイベント作成エラー:', calendarError);
      console.error('エラー詳細:', JSON.stringify(calendarError, null, 2));
    }

    return NextResponse.json({
      success: true,
      data: record,
    });
  } catch (error) {
    console.error('休暇記録エラー:', error);
    return NextResponse.json(
      { success: false, error: { message: '休暇の記録に失敗しました' } },
      { status: 500 }
    );
  }
}
