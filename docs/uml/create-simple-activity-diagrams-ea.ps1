$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$modelBaseName = "haikou-guide-simple-activity-diagrams-standard-v2"
$qeaPath = Join-Path $scriptDir "$modelBaseName.qea"
$eapxPath = Join-Path $scriptDir "$modelBaseName.eapx"
$loginPngPath = Join-Path $scriptDir "15_activity_login.png"
$recommendPngPath = Join-Path $scriptDir "16_activity_recommend_place.png"
$commentPngPath = Join-Path $scriptDir "17_activity_comment_reply.png"
$eaExePath = "D:\EA.exe"

function Move-ExistingFileToBackup {
  param([string]$Path)
  if (-not (Test-Path -LiteralPath $Path)) { return }

  $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
  $directory = Split-Path -Parent $Path
  $name = [System.IO.Path]::GetFileNameWithoutExtension($Path)
  $extension = [System.IO.Path]::GetExtension($Path)
  $backupPath = Join-Path $directory "$name.$timestamp.bak$extension"
  Move-Item -LiteralPath $Path -Destination $backupPath
  Write-Host "Backed up old file: $backupPath"
}

function Get-RootModel {
  param($Repository)
  if ($Repository.Models.Count -gt 0) { return $Repository.Models.GetAt(0) }

  $model = $Repository.Models.AddNew("Model", "Package")
  [void]$model.Update()
  $Repository.Models.Refresh()
  return $model
}

function Add-Package {
  param($ParentPackage, [string]$Name)
  $package = $ParentPackage.Packages.AddNew($Name, "")
  [void]$package.Update()
  $ParentPackage.Packages.Refresh()
  return $package
}

function Add-ActivityElement {
  param(
    $Package,
    [hashtable]$Registry,
    [string]$Key,
    [string]$Name,
    [string]$Type
  )

  $elementType = $Type
  $subtype = $null
  if ($Type -eq "ActivityInitial") {
    $elementType = "StateNode"
    $subtype = 100
  } elseif ($Type -eq "ActivityFinal") {
    $elementType = "StateNode"
    $subtype = 101
  }

  $element = $Package.Elements.AddNew($Name, $elementType)
  if ($null -ne $subtype) { $element.Subtype = $subtype }
  [void]$element.Update()
  $Package.Elements.Refresh()
  $Registry[$Key] = $element
  return $element
}

function Add-Diagram {
  param($Package, [string]$Name, [string]$Notes)
  $diagram = $Package.Diagrams.AddNew($Name, "Activity")
  $diagram.Notes = $Notes
  $diagram.cx = 1020
  $diagram.cy = 880
  [void]$diagram.Update()
  $Package.Diagrams.Refresh()
  return $diagram
}

function Add-DiagramObject {
  param($Diagram, $Element, [int]$Left, [int]$Top, [int]$Width, [int]$Height)
  $style = "l=$Left;r=$($Left + $Width);t=$Top;b=$($Top - $Height);"
  $diagramObject = $Diagram.DiagramObjects.AddNew($style, "")
  $diagramObject.ElementID = $Element.ElementID
  [void]$diagramObject.Update()
  $Diagram.DiagramObjects.Refresh()
  return $diagramObject
}

function Add-ControlFlow {
  param($Diagram, $Source, $Target, [string]$Name = "")
  $connector = $Source.Connectors.AddNew($Name, "ControlFlow")
  $connector.SupplierID = $Target.ElementID
  try { $connector.Direction = "Source -> Destination" } catch {}
  [void]$connector.Update()
  $Source.Connectors.Refresh()

  try {
    $link = $Diagram.DiagramLinks.AddNew("", "")
    $link.ConnectorID = $connector.ConnectorID
    [void]$link.Update()
    $Diagram.DiagramLinks.Refresh()
  } catch {}

  return $connector
}

function New-EaModelFile {
  param($Repository, [string]$PrimaryPath, [string]$FallbackPath)

  Move-ExistingFileToBackup -Path $PrimaryPath
  Move-ExistingFileToBackup -Path $FallbackPath

  try {
    if ([bool]$Repository.CreateModel(0, $PrimaryPath, 0)) { return $PrimaryPath }
  } catch {
    Write-Host "Create .qea failed, trying .eapx: $($_.Exception.Message)"
  }

  if (-not [bool]$Repository.CreateModel(0, $FallbackPath, 0)) {
    throw "EA CreateModel failed."
  }
  return $FallbackPath
}

function Add-LoginActivityDiagram {
  param($Package)

  $r = @{}
  $diagram = Add-Diagram -Package $Package -Name "15 Activity - Login" -Notes "Standard login activity flow. Action nodes contain work steps; decision nodes contain only branch questions."

  Add-ActivityElement -Package $Package -Registry $r -Key "Start" -Name "Start" -Type "ActivityInitial" | Out-Null
  Add-ActivityElement -Package $Package -Registry $r -Key "Open" -Name "Open login page" -Type "Action" | Out-Null
  Add-ActivityElement -Package $Package -Registry $r -Key "Input" -Name "Enter phone and password" -Type "Action" | Out-Null
  Add-ActivityElement -Package $Package -Registry $r -Key "ValidInput" -Name "Input valid?" -Type "Decision" | Out-Null
  Add-ActivityElement -Package $Package -Registry $r -Key "ShowInputError" -Name "Show input error" -Type "Action" | Out-Null
  Add-ActivityElement -Package $Package -Registry $r -Key "Submit" -Name "Submit login request" -Type "Action" | Out-Null
  Add-ActivityElement -Package $Package -Registry $r -Key "FindUser" -Name "Find user by phone" -Type "Action" | Out-Null
  Add-ActivityElement -Package $Package -Registry $r -Key "UserExists" -Name "User exists?" -Type "Decision" | Out-Null
  Add-ActivityElement -Package $Package -Registry $r -Key "CheckPwd" -Name "Check password" -Type "Action" | Out-Null
  Add-ActivityElement -Package $Package -Registry $r -Key "PwdValid" -Name "Password valid?" -Type "Decision" | Out-Null
  Add-ActivityElement -Package $Package -Registry $r -Key "CreateToken" -Name "Create token and return user" -Type "Action" | Out-Null
  Add-ActivityElement -Package $Package -Registry $r -Key "SaveState" -Name "Save login state" -Type "Action" | Out-Null
  Add-ActivityElement -Package $Package -Registry $r -Key "EnterHome" -Name "Enter home page" -Type "Action" | Out-Null
  Add-ActivityElement -Package $Package -Registry $r -Key "ShowAuthError" -Name "Show auth error" -Type "Action" | Out-Null
  Add-ActivityElement -Package $Package -Registry $r -Key "End" -Name "End" -Type "ActivityFinal" | Out-Null

  Add-DiagramObject -Diagram $diagram -Element $r["Start"] -Left 485 -Top 80 -Width 70 -Height 45 | Out-Null
  Add-DiagramObject -Diagram $diagram -Element $r["Open"] -Left 405 -Top 160 -Width 230 -Height 50 | Out-Null
  Add-DiagramObject -Diagram $diagram -Element $r["Input"] -Left 390 -Top 240 -Width 260 -Height 50 | Out-Null
  Add-DiagramObject -Diagram $diagram -Element $r["ValidInput"] -Left 420 -Top 335 -Width 200 -Height 65 | Out-Null
  Add-DiagramObject -Diagram $diagram -Element $r["Submit"] -Left 405 -Top 435 -Width 230 -Height 50 | Out-Null
  Add-DiagramObject -Diagram $diagram -Element $r["FindUser"] -Left 405 -Top 515 -Width 230 -Height 50 | Out-Null
  Add-DiagramObject -Diagram $diagram -Element $r["UserExists"] -Left 420 -Top 610 -Width 200 -Height 65 | Out-Null
  Add-DiagramObject -Diagram $diagram -Element $r["CheckPwd"] -Left 405 -Top 710 -Width 230 -Height 50 | Out-Null
  Add-DiagramObject -Diagram $diagram -Element $r["PwdValid"] -Left 420 -Top 805 -Width 200 -Height 65 | Out-Null
  Add-DiagramObject -Diagram $diagram -Element $r["CreateToken"] -Left 700 -Top 710 -Width 250 -Height 50 | Out-Null
  Add-DiagramObject -Diagram $diagram -Element $r["SaveState"] -Left 700 -Top 790 -Width 230 -Height 50 | Out-Null
  Add-DiagramObject -Diagram $diagram -Element $r["EnterHome"] -Left 700 -Top 870 -Width 230 -Height 50 | Out-Null
  Add-DiagramObject -Diagram $diagram -Element $r["ShowInputError"] -Left 115 -Top 335 -Width 220 -Height 50 | Out-Null
  Add-DiagramObject -Diagram $diagram -Element $r["ShowAuthError"] -Left 115 -Top 675 -Width 220 -Height 50 | Out-Null
  Add-DiagramObject -Diagram $diagram -Element $r["End"] -Left 990 -Top 870 -Width 70 -Height 45 | Out-Null

  Add-ControlFlow -Diagram $diagram -Source $r["Start"] -Target $r["Open"] | Out-Null
  Add-ControlFlow -Diagram $diagram -Source $r["Open"] -Target $r["Input"] | Out-Null
  Add-ControlFlow -Diagram $diagram -Source $r["Input"] -Target $r["ValidInput"] | Out-Null
  Add-ControlFlow -Diagram $diagram -Source $r["ValidInput"] -Target $r["ShowInputError"] -Name "[no]" | Out-Null
  Add-ControlFlow -Diagram $diagram -Source $r["ShowInputError"] -Target $r["Input"] -Name "[retry]" | Out-Null
  Add-ControlFlow -Diagram $diagram -Source $r["ValidInput"] -Target $r["Submit"] -Name "[yes]" | Out-Null
  Add-ControlFlow -Diagram $diagram -Source $r["Submit"] -Target $r["FindUser"] | Out-Null
  Add-ControlFlow -Diagram $diagram -Source $r["FindUser"] -Target $r["UserExists"] | Out-Null
  Add-ControlFlow -Diagram $diagram -Source $r["UserExists"] -Target $r["ShowAuthError"] -Name "[no]" | Out-Null
  Add-ControlFlow -Diagram $diagram -Source $r["ShowAuthError"] -Target $r["Input"] -Name "[retry]" | Out-Null
  Add-ControlFlow -Diagram $diagram -Source $r["UserExists"] -Target $r["CheckPwd"] -Name "[yes]" | Out-Null
  Add-ControlFlow -Diagram $diagram -Source $r["CheckPwd"] -Target $r["PwdValid"] | Out-Null
  Add-ControlFlow -Diagram $diagram -Source $r["PwdValid"] -Target $r["ShowAuthError"] -Name "[no]" | Out-Null
  Add-ControlFlow -Diagram $diagram -Source $r["PwdValid"] -Target $r["CreateToken"] -Name "[yes]" | Out-Null
  Add-ControlFlow -Diagram $diagram -Source $r["CreateToken"] -Target $r["SaveState"] | Out-Null
  Add-ControlFlow -Diagram $diagram -Source $r["SaveState"] -Target $r["EnterHome"] | Out-Null
  Add-ControlFlow -Diagram $diagram -Source $r["EnterHome"] -Target $r["End"] | Out-Null

  [void]$diagram.Update()
  return $diagram
}

function Add-RecommendActivityDiagram {
  param($Package)

  $r = @{}
  $diagram = Add-Diagram -Package $Package -Name "16 Activity - Recommend Place" -Notes "Use case event: user recommends a new place."

  Add-ActivityElement -Package $Package -Registry $r -Key "Start" -Name "Start" -Type "ActivityInitial" | Out-Null
  Add-ActivityElement -Package $Package -Registry $r -Key "Click" -Name "Click Recommend" -Type "Action" | Out-Null
  Add-ActivityElement -Package $Package -Registry $r -Key "Fill" -Name "Fill place info" -Type "Action" | Out-Null
  Add-ActivityElement -Package $Package -Registry $r -Key "NeedLocation" -Name "Need location search?" -Type "Decision" | Out-Null
  Add-ActivityElement -Package $Package -Registry $r -Key "SearchPoi" -Name "Search and select POI" -Type "Action" | Out-Null
  Add-ActivityElement -Package $Package -Registry $r -Key "HasImage" -Name "Upload images?" -Type "Decision" | Out-Null
  Add-ActivityElement -Package $Package -Registry $r -Key "Upload" -Name "Upload and validate images" -Type "Action" | Out-Null
  Add-ActivityElement -Package $Package -Registry $r -Key "ImageValid" -Name "Images valid?" -Type "Decision" | Out-Null
  Add-ActivityElement -Package $Package -Registry $r -Key "ValidateForm" -Name "Validate required info" -Type "Action" | Out-Null
  Add-ActivityElement -Package $Package -Registry $r -Key "FormValid" -Name "Info complete?" -Type "Decision" | Out-Null
  Add-ActivityElement -Package $Package -Registry $r -Key "Save" -Name "Save recommendation" -Type "Action" | Out-Null
  Add-ActivityElement -Package $Package -Registry $r -Key "Refresh" -Name "Refresh place list" -Type "Action" | Out-Null
  Add-ActivityElement -Package $Package -Registry $r -Key "ShowError" -Name "Show error message" -Type "Action" | Out-Null
  Add-ActivityElement -Package $Package -Registry $r -Key "End" -Name "End" -Type "ActivityFinal" | Out-Null

  Add-DiagramObject -Diagram $diagram -Element $r["Start"] -Left 455 -Top 805 -Width 70 -Height 45 | Out-Null
  Add-DiagramObject -Diagram $diagram -Element $r["Click"] -Left 390 -Top 730 -Width 190 -Height 50 | Out-Null
  Add-DiagramObject -Diagram $diagram -Element $r["Fill"] -Left 385 -Top 655 -Width 200 -Height 50 | Out-Null
  Add-DiagramObject -Diagram $diagram -Element $r["NeedLocation"] -Left 385 -Top 565 -Width 200 -Height 60 | Out-Null
  Add-DiagramObject -Diagram $diagram -Element $r["SearchPoi"] -Left 650 -Top 565 -Width 210 -Height 50 | Out-Null
  Add-DiagramObject -Diagram $diagram -Element $r["HasImage"] -Left 385 -Top 470 -Width 200 -Height 60 | Out-Null
  Add-DiagramObject -Diagram $diagram -Element $r["Upload"] -Left 650 -Top 470 -Width 230 -Height 50 | Out-Null
  Add-DiagramObject -Diagram $diagram -Element $r["ImageValid"] -Left 650 -Top 380 -Width 190 -Height 60 | Out-Null
  Add-DiagramObject -Diagram $diagram -Element $r["ValidateForm"] -Left 385 -Top 380 -Width 220 -Height 50 | Out-Null
  Add-DiagramObject -Diagram $diagram -Element $r["FormValid"] -Left 395 -Top 290 -Width 190 -Height 60 | Out-Null
  Add-DiagramObject -Diagram $diagram -Element $r["Save"] -Left 395 -Top 205 -Width 190 -Height 50 | Out-Null
  Add-DiagramObject -Diagram $diagram -Element $r["Refresh"] -Left 395 -Top 125 -Width 190 -Height 50 | Out-Null
  Add-DiagramObject -Diagram $diagram -Element $r["ShowError"] -Left 115 -Top 335 -Width 190 -Height 50 | Out-Null
  Add-DiagramObject -Diagram $diagram -Element $r["End"] -Left 650 -Top 125 -Width 70 -Height 45 | Out-Null

  Add-ControlFlow -Diagram $diagram -Source $r["Start"] -Target $r["Click"] | Out-Null
  Add-ControlFlow -Diagram $diagram -Source $r["Click"] -Target $r["Fill"] | Out-Null
  Add-ControlFlow -Diagram $diagram -Source $r["Fill"] -Target $r["NeedLocation"] | Out-Null
  Add-ControlFlow -Diagram $diagram -Source $r["NeedLocation"] -Target $r["SearchPoi"] -Name "Yes" | Out-Null
  Add-ControlFlow -Diagram $diagram -Source $r["SearchPoi"] -Target $r["HasImage"] | Out-Null
  Add-ControlFlow -Diagram $diagram -Source $r["NeedLocation"] -Target $r["HasImage"] -Name "No" | Out-Null
  Add-ControlFlow -Diagram $diagram -Source $r["HasImage"] -Target $r["Upload"] -Name "Yes" | Out-Null
  Add-ControlFlow -Diagram $diagram -Source $r["Upload"] -Target $r["ImageValid"] | Out-Null
  Add-ControlFlow -Diagram $diagram -Source $r["ImageValid"] -Target $r["ShowError"] -Name "No" | Out-Null
  Add-ControlFlow -Diagram $diagram -Source $r["ShowError"] -Target $r["Fill"] -Name "Retry" | Out-Null
  Add-ControlFlow -Diagram $diagram -Source $r["ImageValid"] -Target $r["ValidateForm"] -Name "Yes" | Out-Null
  Add-ControlFlow -Diagram $diagram -Source $r["HasImage"] -Target $r["ValidateForm"] -Name "No" | Out-Null
  Add-ControlFlow -Diagram $diagram -Source $r["ValidateForm"] -Target $r["FormValid"] | Out-Null
  Add-ControlFlow -Diagram $diagram -Source $r["FormValid"] -Target $r["ShowError"] -Name "No" | Out-Null
  Add-ControlFlow -Diagram $diagram -Source $r["FormValid"] -Target $r["Save"] -Name "Yes" | Out-Null
  Add-ControlFlow -Diagram $diagram -Source $r["Save"] -Target $r["Refresh"] | Out-Null
  Add-ControlFlow -Diagram $diagram -Source $r["Refresh"] -Target $r["End"] | Out-Null

  [void]$diagram.Update()
  return $diagram
}

function Add-CommentActivityDiagram {
  param($Package)

  $r = @{}
  $diagram = Add-Diagram -Package $Package -Name "17 Activity - Comment Reply" -Notes "Use case event: user posts a comment or reply."

  Add-ActivityElement -Package $Package -Registry $r -Key "Start" -Name "Start" -Type "ActivityInitial" | Out-Null
  Add-ActivityElement -Package $Package -Registry $r -Key "Open" -Name "Open comment panel" -Type "Action" | Out-Null
  Add-ActivityElement -Package $Package -Registry $r -Key "Load" -Name "Load comments" -Type "Action" | Out-Null
  Add-ActivityElement -Package $Package -Registry $r -Key "Input" -Name "Enter content or choose images" -Type "Action" | Out-Null
  Add-ActivityElement -Package $Package -Registry $r -Key "IsReply" -Name "Reply to another comment?" -Type "Decision" | Out-Null
  Add-ActivityElement -Package $Package -Registry $r -Key "SetParent" -Name "Set parent comment" -Type "Action" | Out-Null
  Add-ActivityElement -Package $Package -Registry $r -Key "HasContent" -Name "Content or image exists?" -Type "Decision" | Out-Null
  Add-ActivityElement -Package $Package -Registry $r -Key "HasImage" -Name "Has image?" -Type "Decision" | Out-Null
  Add-ActivityElement -Package $Package -Registry $r -Key "Upload" -Name "Upload and validate images" -Type "Action" | Out-Null
  Add-ActivityElement -Package $Package -Registry $r -Key "ImageValid" -Name "Images valid?" -Type "Decision" | Out-Null
  Add-ActivityElement -Package $Package -Registry $r -Key "Save" -Name "Save comment" -Type "Action" | Out-Null
  Add-ActivityElement -Package $Package -Registry $r -Key "NeedNotice" -Name "Need notification?" -Type "Decision" | Out-Null
  Add-ActivityElement -Package $Package -Registry $r -Key "Notice" -Name "Create notification" -Type "Action" | Out-Null
  Add-ActivityElement -Package $Package -Registry $r -Key "Refresh" -Name "Refresh comment panel" -Type "Action" | Out-Null
  Add-ActivityElement -Package $Package -Registry $r -Key "ShowError" -Name "Show error message" -Type "Action" | Out-Null
  Add-ActivityElement -Package $Package -Registry $r -Key "End" -Name "End" -Type "ActivityFinal" | Out-Null

  Add-DiagramObject -Diagram $diagram -Element $r["Start"] -Left 455 -Top 810 -Width 70 -Height 45 | Out-Null
  Add-DiagramObject -Diagram $diagram -Element $r["Open"] -Left 390 -Top 735 -Width 200 -Height 50 | Out-Null
  Add-DiagramObject -Diagram $diagram -Element $r["Load"] -Left 390 -Top 660 -Width 200 -Height 50 | Out-Null
  Add-DiagramObject -Diagram $diagram -Element $r["Input"] -Left 365 -Top 585 -Width 250 -Height 50 | Out-Null
  Add-DiagramObject -Diagram $diagram -Element $r["IsReply"] -Left 375 -Top 495 -Width 230 -Height 60 | Out-Null
  Add-DiagramObject -Diagram $diagram -Element $r["SetParent"] -Left 650 -Top 495 -Width 190 -Height 50 | Out-Null
  Add-DiagramObject -Diagram $diagram -Element $r["HasContent"] -Left 370 -Top 405 -Width 240 -Height 60 | Out-Null
  Add-DiagramObject -Diagram $diagram -Element $r["HasImage"] -Left 390 -Top 315 -Width 200 -Height 60 | Out-Null
  Add-DiagramObject -Diagram $diagram -Element $r["Upload"] -Left 650 -Top 315 -Width 230 -Height 50 | Out-Null
  Add-DiagramObject -Diagram $diagram -Element $r["ImageValid"] -Left 650 -Top 225 -Width 190 -Height 60 | Out-Null
  Add-DiagramObject -Diagram $diagram -Element $r["Save"] -Left 395 -Top 225 -Width 190 -Height 50 | Out-Null
  Add-DiagramObject -Diagram $diagram -Element $r["NeedNotice"] -Left 385 -Top 135 -Width 210 -Height 60 | Out-Null
  Add-DiagramObject -Diagram $diagram -Element $r["Notice"] -Left 650 -Top 135 -Width 190 -Height 50 | Out-Null
  Add-DiagramObject -Diagram $diagram -Element $r["Refresh"] -Left 395 -Top 50 -Width 190 -Height 50 | Out-Null
  Add-DiagramObject -Diagram $diagram -Element $r["ShowError"] -Left 110 -Top 315 -Width 190 -Height 50 | Out-Null
  Add-DiagramObject -Diagram $diagram -Element $r["End"] -Left 650 -Top 50 -Width 70 -Height 45 | Out-Null

  Add-ControlFlow -Diagram $diagram -Source $r["Start"] -Target $r["Open"] | Out-Null
  Add-ControlFlow -Diagram $diagram -Source $r["Open"] -Target $r["Load"] | Out-Null
  Add-ControlFlow -Diagram $diagram -Source $r["Load"] -Target $r["Input"] | Out-Null
  Add-ControlFlow -Diagram $diagram -Source $r["Input"] -Target $r["IsReply"] | Out-Null
  Add-ControlFlow -Diagram $diagram -Source $r["IsReply"] -Target $r["SetParent"] -Name "Yes" | Out-Null
  Add-ControlFlow -Diagram $diagram -Source $r["SetParent"] -Target $r["HasContent"] | Out-Null
  Add-ControlFlow -Diagram $diagram -Source $r["IsReply"] -Target $r["HasContent"] -Name "No" | Out-Null
  Add-ControlFlow -Diagram $diagram -Source $r["HasContent"] -Target $r["ShowError"] -Name "No" | Out-Null
  Add-ControlFlow -Diagram $diagram -Source $r["ShowError"] -Target $r["Input"] -Name "Retry" | Out-Null
  Add-ControlFlow -Diagram $diagram -Source $r["HasContent"] -Target $r["HasImage"] -Name "Yes" | Out-Null
  Add-ControlFlow -Diagram $diagram -Source $r["HasImage"] -Target $r["Upload"] -Name "Yes" | Out-Null
  Add-ControlFlow -Diagram $diagram -Source $r["Upload"] -Target $r["ImageValid"] | Out-Null
  Add-ControlFlow -Diagram $diagram -Source $r["ImageValid"] -Target $r["ShowError"] -Name "No" | Out-Null
  Add-ControlFlow -Diagram $diagram -Source $r["ImageValid"] -Target $r["Save"] -Name "Yes" | Out-Null
  Add-ControlFlow -Diagram $diagram -Source $r["HasImage"] -Target $r["Save"] -Name "No" | Out-Null
  Add-ControlFlow -Diagram $diagram -Source $r["Save"] -Target $r["NeedNotice"] | Out-Null
  Add-ControlFlow -Diagram $diagram -Source $r["NeedNotice"] -Target $r["Notice"] -Name "Reply" | Out-Null
  Add-ControlFlow -Diagram $diagram -Source $r["Notice"] -Target $r["Refresh"] | Out-Null
  Add-ControlFlow -Diagram $diagram -Source $r["NeedNotice"] -Target $r["Refresh"] -Name "Normal comment" | Out-Null
  Add-ControlFlow -Diagram $diagram -Source $r["Refresh"] -Target $r["End"] | Out-Null

  [void]$diagram.Update()
  return $diagram
}

function Build-SimpleActivityModel {
  param($Repository)

  $root = Get-RootModel -Repository $Repository
  $modelPackage = Add-Package -ParentPackage $root -Name "Haikou Guide Simple Activity Diagrams"
  $modelPackage.Notes = "Generated by create-simple-activity-diagrams-ea.ps1 through Enterprise Architect COM."
  [void]$modelPackage.Update()

  $activityPackage = Add-Package -ParentPackage $modelPackage -Name "Simple Activity Diagrams"
  $loginDiagram = Add-LoginActivityDiagram -Package $activityPackage
  $recommendDiagram = Add-RecommendActivityDiagram -Package $activityPackage
  $commentDiagram = Add-CommentActivityDiagram -Package $activityPackage

  foreach ($diagram in @($loginDiagram, $recommendDiagram, $commentDiagram)) {
    $Repository.SaveDiagram($diagram.DiagramID)
    $Repository.ReloadDiagram($diagram.DiagramID)
  }
  $Repository.RefreshModelView($modelPackage.PackageID)

  return @{
    LoginDiagram = $loginDiagram
    RecommendDiagram = $recommendDiagram
    CommentDiagram = $commentDiagram
    ModelPackage = $modelPackage
  }
}

$repository = $null
try {
  $repository = New-Object -ComObject EA.Repository
  $modelPath = New-EaModelFile -Repository $repository -PrimaryPath $qeaPath -FallbackPath $eapxPath
  [void]$repository.OpenFile($modelPath)
  $result = Build-SimpleActivityModel -Repository $repository

  $project = $repository.GetProjectInterface()
  Move-ExistingFileToBackup -Path $loginPngPath
  Move-ExistingFileToBackup -Path $recommendPngPath
  Move-ExistingFileToBackup -Path $commentPngPath
  [void]$project.PutDiagramImageToFile($project.GUIDtoXML($result.LoginDiagram.DiagramGUID), $loginPngPath, 1)
  [void]$project.PutDiagramImageToFile($project.GUIDtoXML($result.RecommendDiagram.DiagramGUID), $recommendPngPath, 1)
  [void]$project.PutDiagramImageToFile($project.GUIDtoXML($result.CommentDiagram.DiagramGUID), $commentPngPath, 1)
  [void]$repository.CloseFile()
  [void]$repository.Exit()
  $repository = $null

  if (Test-Path -LiteralPath $eaExePath) {
    Start-Process -FilePath $eaExePath -ArgumentList "`"$modelPath`"" -WindowStyle Normal | Out-Null
  } else {
    Start-Process -FilePath $modelPath -WindowStyle Normal | Out-Null
  }

  Write-Host "EA model file: $modelPath"
  Write-Host "Exported diagram image: $loginPngPath"
  Write-Host "Exported diagram image: $recommendPngPath"
  Write-Host "Exported diagram image: $commentPngPath"
  Write-Host "Diagram names: 15 Activity - Login; 16 Activity - Recommend Place; 17 Activity - Comment Reply"
} finally {
  if ($repository -ne $null) {
    try { [void]$repository.CloseFile() } catch {}
    try { [void]$repository.Exit() } catch {}
  }
}
