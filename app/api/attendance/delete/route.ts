// 勤怠記録削除API

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentStaff } from '@/lib/auth/helpers';
import { GoogleCalendarService } from '@/lib/services/GoogleCalendarService';

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // 認証チェック
    const staff = await getCurrentStaff();

    // リクエストボディから記録IDを取得
    const body = await request.json();
    const { recordId } = body as { recordId: string };

    console.log('削除リクエスト受信:', { recordId, staffId: staff.id });

    if (!recordId) {
      return NextResponse.json(
        { success: false, error: { message: '記録IDが指定されていません' } },
        { status: 400 }
      );
    }

    // 記録を取得（カレンダーイベントIDを含む）
    const { data: record, error: fetchError } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('id', recordId)
      .eq('staff_id', staff.id)
      .single();

    console.log('記録取得結果:', { record, fetchError });

    if (fetchError || !record) {
      return NextResponse.json(
        { success: false, error: { message: '記録が見つかりません' } },
        { status: 404 }
      );
    }

    // Googleカレンダーイベントを削除（存在する場合）
    if (record.google_calendar_event_id) {
      try {
        console.log('カレンダーイベント削除を開始:', record.google_calendar_event_id);
        const calendarService = new GoogleCalendarService();
        const isConnected = await calendarService.isCalendarConnected(supabase, staff.id);

        console.log('カレンダー連携状態:', isConnected);

        if (isConnected) {
          await calendarService.deleteCalendarEvent(
            supabase,
            staff.id,
            record.google_calendar_event_id
          );
          console.log('カレンダーイベント削除成功');
        }
      } catch (calendarError) {
        // カレンダーイベント削除に失敗しても、記録削除は続行
        console.error('カレンダーイベント削除エラー:', calendarError);
      }
    } else {
      console.log('カレンダーイベントIDが存在しないため、スキップ');
    }

    // データベースから記録を削除
    console.log('データベースから記録を削除中...');
    const { error: deleteError } = await supabase
      .from('attendance_records')
      .delete()
      .eq('id', recordId)
      .eq('staff_id', staff.id);

    console.log('削除結果:', { deleteError });

    if (deleteError) {
      console.error('記録削除エラー:', deleteError);
      return NextResponse.json(
        { success: false, error: { message: '記録の削除に失敗しました' } },
        { status: 500 }
      );
    }

    console.log('削除成功');
    return NextResponse.json({
      success: true,
      message: '記録を削除しました',
    });
  } catch (error) {
    console.error('記録削除エラー:', error);
    return NextResponse.json(
      { success: false, error: { message: '記録の削除に失敗しました' } },
      { status: 500 }
    );
  }
}
