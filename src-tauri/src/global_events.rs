use std::sync::atomic::{AtomicBool, AtomicPtr, Ordering};
use std::sync::Mutex;
use tauri::{AppHandle, Manager};
use serde::Serialize;

#[cfg(target_os = "windows")]
use windows::Win32::UI::WindowsAndMessaging::{
    SetWindowsHookExA, UnhookWindowsHookEx, CallNextHookEx,
    WH_KEYBOARD_LL, WH_MOUSE_LL, KBDLLHOOKSTRUCT, MSLLHOOKSTRUCT,
    HC_ACTION, WM_KEYDOWN, WM_KEYUP, WM_LBUTTONDOWN, WM_LBUTTONUP,
    WM_RBUTTONDOWN, WM_RBUTTONUP, WM_MBUTTONDOWN, WM_MBUTTONUP,
};
#[cfg(target_os = "windows")]
use windows::Win32::Foundation::{LPARAM, LRESULT, WPARAM, HHOOK};

// 事件數據結構
#[derive(Clone, Serialize)]
pub struct DeviceEvent {
    pub kind: String,
    pub value: String,
}

// 全局變數
static GLOBAL_EVENTS_REGISTERED: AtomicBool = AtomicBool::new(false);
static APP_HANDLE: AtomicPtr<AppHandle> = AtomicPtr::new(std::ptr::null_mut());

#[cfg(target_os = "windows")]
static mut KEYBOARD_HOOK: Option<HHOOK> = None;
#[cfg(target_os = "windows")]
static mut MOUSE_HOOK: Option<HHOOK> = None;

// 設置應用程序句柄
pub fn set_app_handle(app_handle: &AppHandle) {
    let ptr = Box::into_raw(Box::new(app_handle.clone()));
    APP_HANDLE.store(ptr as *mut _, Ordering::SeqCst);
}

// 註冊全局事件監聽器
#[cfg(target_os = "windows")]
pub unsafe fn register_global_events() -> Result<(), String> {
    if GLOBAL_EVENTS_REGISTERED.load(Ordering::SeqCst) {
        return Ok(());
    }

    // 鍵盤鉤子回調函數
    unsafe extern "system" fn keyboard_hook_proc(code: i32, wparam: WPARAM, lparam: LPARAM) -> LRESULT {
        if code == HC_ACTION as i32 {
            let kb_struct = &*(lparam.0 as *const KBDLLHOOKSTRUCT);
            let app_handle_ptr = APP_HANDLE.load(Ordering::SeqCst);
            
            if !app_handle_ptr.is_null() {
                let app_handle = &*(app_handle_ptr as *const AppHandle);
                
                if wparam.0 == WM_KEYDOWN as usize {
                    // 觸發按鍵按下事件
                    let virtual_key = kb_struct.vkCode as u32;
                    let key = virtual_key_to_string(virtual_key);
                    
                    let _ = app_handle.emit_all("device-changed", DeviceEvent {
                        kind: "KeyboardPress".to_string(),
                        value: key,
                    });
                } else if wparam.0 == WM_KEYUP as usize {
                    // 觸發按鍵釋放事件
                    let virtual_key = kb_struct.vkCode as u32;
                    let key = virtual_key_to_string(virtual_key);
                    
                    let _ = app_handle.emit_all("device-changed", DeviceEvent {
                        kind: "KeyboardRelease".to_string(),
                        value: key,
                    });
                }
            }
        }
        
        // 調用下一個鉤子
        CallNextHookEx(KEYBOARD_HOOK, code, wparam, lparam)
    }
    
    // 滑鼠鉤子回調函數
    unsafe extern "system" fn mouse_hook_proc(code: i32, wparam: WPARAM, lparam: LPARAM) -> LRESULT {
        if code == HC_ACTION as i32 {
            let app_handle_ptr = APP_HANDLE.load(Ordering::SeqCst);
            
            if !app_handle_ptr.is_null() {
                let app_handle = &*(app_handle_ptr as *const AppHandle);
                
                match wparam.0 as u32 {
                    WM_LBUTTONDOWN => {
                        let _ = app_handle.emit_all("device-changed", DeviceEvent {
                            kind: "MousePress".to_string(),
                            value: "0".to_string(), // 左鍵
                        });
                    }
                    WM_LBUTTONUP => {
                        let _ = app_handle.emit_all("device-changed", DeviceEvent {
                            kind: "MouseRelease".to_string(),
                            value: "0".to_string(), // 左鍵
                        });
                    }
                    WM_RBUTTONDOWN => {
                        let _ = app_handle.emit_all("device-changed", DeviceEvent {
                            kind: "MousePress".to_string(),
                            value: "2".to_string(), // 右鍵
                        });
                    }
                    WM_RBUTTONUP => {
                        let _ = app_handle.emit_all("device-changed", DeviceEvent {
                            kind: "MouseRelease".to_string(),
                            value: "2".to_string(), // 右鍵
                        });
                    }
                    WM_MBUTTONDOWN => {
                        let _ = app_handle.emit_all("device-changed", DeviceEvent {
                            kind: "MousePress".to_string(),
                            value: "1".to_string(), // 中鍵
                        });
                    }
                    WM_MBUTTONUP => {
                        let _ = app_handle.emit_all("device-changed", DeviceEvent {
                            kind: "MouseRelease".to_string(),
                            value: "1".to_string(), // 中鍵
                        });
                    }
                    _ => {}
                }
            }
        }
        
        // 調用下一個鉤子
        CallNextHookEx(MOUSE_HOOK, code, wparam, lparam)
    }
    
    // 設置鍵盤鉤子
    KEYBOARD_HOOK = Some(SetWindowsHookExA(
        WH_KEYBOARD_LL,
        Some(keyboard_hook_proc),
        None,
        0
    )?);
    
    // 設置滑鼠鉤子
    MOUSE_HOOK = Some(SetWindowsHookExA(
        WH_MOUSE_LL,
        Some(mouse_hook_proc),
        None,
        0
    )?);
    
    GLOBAL_EVENTS_REGISTERED.store(true, Ordering::SeqCst);
    
    Ok(())
}

// 取消註冊全局事件監聽器
#[cfg(target_os = "windows")]
pub unsafe fn unregister_global_events() -> Result<(), String> {
    if !GLOBAL_EVENTS_REGISTERED.load(Ordering::SeqCst) {
        return Ok(());
    }
    
    // 取消鍵盤鉤子
    if let Some(hook) = KEYBOARD_HOOK {
        UnhookWindowsHookEx(hook)?;
        KEYBOARD_HOOK = None;
    }
    
    // 取消滑鼠鉤子
    if let Some(hook) = MOUSE_HOOK {
        UnhookWindowsHookEx(hook)?;
        MOUSE_HOOK = None;
    }
    
    GLOBAL_EVENTS_REGISTERED.store(false, Ordering::SeqCst);
    
    Ok(())
}

// 虛擬按鍵轉換為字符串
#[cfg(target_os = "windows")]
fn virtual_key_to_string(vk: u32) -> String {
    // 簡單的實現，需要完善
    match vk {
        // 字母鍵
        0x41 => "a".to_string(),
        0x42 => "b".to_string(),
        0x43 => "c".to_string(),
        0x44 => "d".to_string(),
        0x45 => "e".to_string(),
        0x46 => "f".to_string(),
        0x47 => "g".to_string(),
        0x48 => "h".to_string(),
        0x49 => "i".to_string(),
        0x4A => "j".to_string(),
        0x4B => "k".to_string(),
        0x4C => "l".to_string(),
        0x4D => "m".to_string(),
        0x4E => "n".to_string(),
        0x4F => "o".to_string(),
        0x50 => "p".to_string(),
        0x51 => "q".to_string(),
        0x52 => "r".to_string(),
        0x53 => "s".to_string(),
        0x54 => "t".to_string(),
        0x55 => "u".to_string(),
        0x56 => "v".to_string(),
        0x57 => "w".to_string(),
        0x58 => "x".to_string(),
        0x59 => "y".to_string(),
        0x5A => "z".to_string(),
        
        // 數字鍵
        0x30 => "0".to_string(),
        0x31 => "1".to_string(),
        0x32 => "2".to_string(),
        0x33 => "3".to_string(),
        0x34 => "4".to_string(),
        0x35 => "5".to_string(),
        0x36 => "6".to_string(),
        0x37 => "7".to_string(),
        0x38 => "8".to_string(),
        0x39 => "9".to_string(),
        
        // 方向鍵
        0x25 => "ArrowLeft".to_string(),
        0x26 => "ArrowUp".to_string(),
        0x27 => "ArrowRight".to_string(),
        0x28 => "ArrowDown".to_string(),
        
        // 更多按鍵映射可以添加在這裡
        
        _ => format!("Unknown_{}", vk), // 未知按鍵
    }
}

// 非Windows平台的空實現
#[cfg(not(target_os = "windows"))]
pub unsafe fn register_global_events() -> Result<(), String> {
    Err("全局事件監聽器僅支持Windows平台".to_string())
}

#[cfg(not(target_os = "windows"))]
pub unsafe fn unregister_global_events() -> Result<(), String> {
    Ok(())
} 