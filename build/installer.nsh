!macro customInit
  ; 기존 설치 경로에서 언인스톨러 찾기
  ReadRegStr $0 SHCTX "Software\Microsoft\Windows\CurrentVersion\Uninstall\{${APP_INSTALLER_STORE_FILE}}" "UninstallString"
  ${If} $0 != ""
    ; 언인스톨러 경로에서 따옴표 제거
    StrCpy $1 $0 "" 1
    StrCpy $1 $1 -1

    ${If} ${FileExists} "$1"
      MessageBox MB_YESNO "$(^Name) 이전 버전이 설치되어 있습니다.$\n기존 버전을 제거하고 새 버전을 설치하시겠습니까?" IDYES uninst IDNO abort
      abort:
        Abort
      uninst:
        ; 기존 언인스톨러 실행 시도
        ClearErrors
        ExecWait '"$0" /S _?=$INSTDIR'

        ${If} ${Errors}
          ; 언인스톨러 실패 시 설치 폴더 강제 삭제
          RMDir /r "$INSTDIR"
        ${EndIf}
    ${EndIf}
  ${EndIf}
!macroend
