; Polaris IDE - NSIS Installer Custom Script

!macro customInstall
  ; Register file associations
  WriteRegStr HKCU "Software\Classes\.polaris" "" "PolarisIDE.Project"
  WriteRegStr HKCU "Software\Classes\PolarisIDE.Project" "" "Polaris IDE Project"
  WriteRegStr HKCU "Software\Classes\PolarisIDE.Project\DefaultIcon" "" "$INSTDIR\Polaris IDE.exe,0"
  WriteRegStr HKCU "Software\Classes\PolarisIDE.Project\shell\open\command" "" '"$INSTDIR\Polaris IDE.exe" "%1"'

  ; Register URL scheme handler
  WriteRegStr HKCU "Software\Classes\polaris" "" "URL:Polaris IDE"
  WriteRegStr HKCU "Software\Classes\polaris" "URL Protocol" ""
  WriteRegStr HKCU "Software\Classes\polaris\DefaultIcon" "" "$INSTDIR\Polaris IDE.exe,0"
  WriteRegStr HKCU "Software\Classes\polaris\shell\open\command" "" '"$INSTDIR\Polaris IDE.exe" "%1"'

  ; Notify shell of changes
  System::Call 'shell32::SHChangeNotify(i 0x08000000, i 0, i 0, i 0)'
!macroend

!macro customUnInstall
  ; Remove file associations
  DeleteRegKey HKCU "Software\Classes\.polaris"
  DeleteRegKey HKCU "Software\Classes\PolarisIDE.Project"
  DeleteRegKey HKCU "Software\Classes\polaris"

  ; Notify shell of changes
  System::Call 'shell32::SHChangeNotify(i 0x08000000, i 0, i 0, i 0)'
!macroend
