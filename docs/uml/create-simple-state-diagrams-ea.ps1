$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$modelBaseName = "haikou-guide-simple-state-diagrams-standard"
$qeaPath = Join-Path $scriptDir "$modelBaseName.qea"
$eapxPath = Join-Path $scriptDir "$modelBaseName.eapx"
$commentPngPath = Join-Path $scriptDir "12_state_comment.png"
$recommendPngPath = Join-Path $scriptDir "13_state_recommended_place.png"
$feedbackPngPath = Join-Path $scriptDir "14_state_feedback.png"
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

function Add-State {
  param($Package, [hashtable]$Registry, [string]$Key, [string]$Name)
  $state = $Package.Elements.AddNew($Name, "State")
  [void]$state.Update()
  $Package.Elements.Refresh()
  $Registry[$Key] = $state
  return $state
}

function Add-StateNode {
  param($Package, [hashtable]$Registry, [string]$Key, [string]$Name, [int]$Subtype)
  $node = $Package.Elements.AddNew($Name, "StateNode")
  $node.Subtype = $Subtype
  [void]$node.Update()
  $Package.Elements.Refresh()
  $Registry[$Key] = $node
  return $node
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

function Add-StateFlow {
  param($Diagram, $Source, $Target, [string]$Name = "")
  $connector = $Source.Connectors.AddNew($Name, "StateFlow")
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

function Add-StateDiagram {
  param($Package, [string]$Name, [string]$Notes)
  $diagram = $Package.Diagrams.AddNew($Name, "Statechart")
  $diagram.Notes = $Notes
  $diagram.cx = 1120
  $diagram.cy = 620
  [void]$diagram.Update()
  $Package.Diagrams.Refresh()
  return $diagram
}

function Add-CommentStateDiagram {
  param($Package)

  $r = @{}
  $diagram = Add-StateDiagram -Package $Package -Name "12 State - Comment" -Notes "Standard object lifecycle for a place comment. Interaction events are modeled as transitions, not states."

  Add-StateNode -Package $Package -Registry $r -Key "Start" -Name "Start" -Subtype 0 | Out-Null
  Add-State -Package $Package -Registry $r -Key "Draft" -Name "Draft" | Out-Null
  Add-State -Package $Package -Registry $r -Key "Ready" -Name "ReadyToSubmit" | Out-Null
  Add-State -Package $Package -Registry $r -Key "Checking" -Name "ImageChecking" | Out-Null
  Add-State -Package $Package -Registry $r -Key "Published" -Name "Published" | Out-Null
  Add-State -Package $Package -Registry $r -Key "Deleted" -Name "Deleted" | Out-Null
  Add-StateNode -Package $Package -Registry $r -Key "End" -Name "End" -Subtype 1 | Out-Null

  Add-DiagramObject -Diagram $diagram -Element $r["Start"] -Left 45 -Top 390 -Width 60 -Height 45 | Out-Null
  Add-DiagramObject -Diagram $diagram -Element $r["Draft"] -Left 135 -Top 390 -Width 130 -Height 55 | Out-Null
  Add-DiagramObject -Diagram $diagram -Element $r["Ready"] -Left 330 -Top 390 -Width 165 -Height 55 | Out-Null
  Add-DiagramObject -Diagram $diagram -Element $r["Checking"] -Left 560 -Top 390 -Width 165 -Height 55 | Out-Null
  Add-DiagramObject -Diagram $diagram -Element $r["Published"] -Left 815 -Top 390 -Width 135 -Height 55 | Out-Null
  Add-DiagramObject -Diagram $diagram -Element $r["Deleted"] -Left 815 -Top 185 -Width 135 -Height 55 | Out-Null
  Add-DiagramObject -Diagram $diagram -Element $r["End"] -Left 1005 -Top 185 -Width 60 -Height 45 | Out-Null

  Add-StateFlow -Diagram $diagram -Source $r["Start"] -Target $r["Draft"] | Out-Null
  Add-StateFlow -Diagram $diagram -Source $r["Draft"] -Target $r["Ready"] -Name "edit content" | Out-Null
  Add-StateFlow -Diagram $diagram -Source $r["Ready"] -Target $r["Checking"] -Name "submit [has image]" | Out-Null
  Add-StateFlow -Diagram $diagram -Source $r["Checking"] -Target $r["Published"] -Name "image saved" | Out-Null
  Add-StateFlow -Diagram $diagram -Source $r["Ready"] -Target $r["Published"] -Name "submit [no image]" | Out-Null
  Add-StateFlow -Diagram $diagram -Source $r["Published"] -Target $r["Published"] -Name "like or reply / create notice" | Out-Null
  Add-StateFlow -Diagram $diagram -Source $r["Published"] -Target $r["Deleted"] -Name "owner/admin deletes" | Out-Null
  Add-StateFlow -Diagram $diagram -Source $r["Deleted"] -Target $r["End"] | Out-Null

  [void]$diagram.Update()
  return $diagram
}

function Add-RecommendStateDiagram {
  param($Package)

  $r = @{}
  $diagram = Add-StateDiagram -Package $Package -Name "13 State - RecommendedPlace" -Notes "Standard object lifecycle for a user recommended place. Likes and comments are modeled as events on the published state."

  Add-StateNode -Package $Package -Registry $r -Key "Start" -Name "Start" -Subtype 0 | Out-Null
  Add-State -Package $Package -Registry $r -Key "Draft" -Name "Draft" | Out-Null
  Add-State -Package $Package -Registry $r -Key "Locating" -Name "Locating" | Out-Null
  Add-State -Package $Package -Registry $r -Key "Ready" -Name "ReadyToPublish" | Out-Null
  Add-State -Package $Package -Registry $r -Key "Uploading" -Name "ImageUploading" | Out-Null
  Add-State -Package $Package -Registry $r -Key "Published" -Name "Published" | Out-Null
  Add-State -Package $Package -Registry $r -Key "Deleted" -Name "Deleted" | Out-Null
  Add-StateNode -Package $Package -Registry $r -Key "End" -Name "End" -Subtype 1 | Out-Null

  Add-DiagramObject -Diagram $diagram -Element $r["Start"] -Left 45 -Top 380 -Width 60 -Height 45 | Out-Null
  Add-DiagramObject -Diagram $diagram -Element $r["Draft"] -Left 135 -Top 380 -Width 125 -Height 55 | Out-Null
  Add-DiagramObject -Diagram $diagram -Element $r["Locating"] -Left 325 -Top 380 -Width 130 -Height 55 | Out-Null
  Add-DiagramObject -Diagram $diagram -Element $r["Ready"] -Left 520 -Top 380 -Width 165 -Height 55 | Out-Null
  Add-DiagramObject -Diagram $diagram -Element $r["Uploading"] -Left 745 -Top 380 -Width 160 -Height 55 | Out-Null
  Add-DiagramObject -Diagram $diagram -Element $r["Published"] -Left 965 -Top 380 -Width 135 -Height 55 | Out-Null
  Add-DiagramObject -Diagram $diagram -Element $r["Deleted"] -Left 745 -Top 185 -Width 135 -Height 55 | Out-Null
  Add-DiagramObject -Diagram $diagram -Element $r["End"] -Left 965 -Top 185 -Width 60 -Height 45 | Out-Null

  Add-StateFlow -Diagram $diagram -Source $r["Start"] -Target $r["Draft"] | Out-Null
  Add-StateFlow -Diagram $diagram -Source $r["Draft"] -Target $r["Locating"] -Name "enter name and search POI" | Out-Null
  Add-StateFlow -Diagram $diagram -Source $r["Locating"] -Target $r["Ready"] -Name "select location" | Out-Null
  Add-StateFlow -Diagram $diagram -Source $r["Ready"] -Target $r["Uploading"] -Name "submit [has image]" | Out-Null
  Add-StateFlow -Diagram $diagram -Source $r["Uploading"] -Target $r["Published"] -Name "images saved" | Out-Null
  Add-StateFlow -Diagram $diagram -Source $r["Ready"] -Target $r["Published"] -Name "submit [no image]" | Out-Null
  Add-StateFlow -Diagram $diagram -Source $r["Published"] -Target $r["Published"] -Name "like or comment / update stats" | Out-Null
  Add-StateFlow -Diagram $diagram -Source $r["Published"] -Target $r["Deleted"] -Name "owner/admin deletes" | Out-Null
  Add-StateFlow -Diagram $diagram -Source $r["Deleted"] -Target $r["End"] | Out-Null

  [void]$diagram.Update()
  return $diagram
}

function Add-FeedbackStateDiagramSimple {
  param($Package)

  $r = @{}
  $diagram = Add-StateDiagram -Package $Package -Name "14 State - Feedback" -Notes "Standard object lifecycle for feedback. Submission and follow-up are modeled as transitions into persistent review states."

  Add-StateNode -Package $Package -Registry $r -Key "Start" -Name "Start" -Subtype 0 | Out-Null
  Add-State -Package $Package -Registry $r -Key "Draft" -Name "Draft" | Out-Null
  Add-State -Package $Package -Registry $r -Key "Unread" -Name "Unread" | Out-Null
  Add-State -Package $Package -Registry $r -Key "Read" -Name "Read" | Out-Null
  Add-State -Package $Package -Registry $r -Key "Replied" -Name "Replied" | Out-Null
  Add-State -Package $Package -Registry $r -Key "Resolved" -Name "Resolved" | Out-Null
  Add-State -Package $Package -Registry $r -Key "Reopened" -Name "Reopened" | Out-Null
  Add-State -Package $Package -Registry $r -Key "Deleted" -Name "Deleted" | Out-Null
  Add-StateNode -Package $Package -Registry $r -Key "End" -Name "End" -Subtype 1 | Out-Null

  Add-DiagramObject -Diagram $diagram -Element $r["Start"] -Left 45 -Top 405 -Width 60 -Height 45 | Out-Null
  Add-DiagramObject -Diagram $diagram -Element $r["Draft"] -Left 135 -Top 405 -Width 120 -Height 55 | Out-Null
  Add-DiagramObject -Diagram $diagram -Element $r["Unread"] -Left 315 -Top 405 -Width 120 -Height 55 | Out-Null
  Add-DiagramObject -Diagram $diagram -Element $r["Read"] -Left 495 -Top 405 -Width 120 -Height 55 | Out-Null
  Add-DiagramObject -Diagram $diagram -Element $r["Replied"] -Left 675 -Top 405 -Width 120 -Height 55 | Out-Null
  Add-DiagramObject -Diagram $diagram -Element $r["Resolved"] -Left 855 -Top 405 -Width 125 -Height 55 | Out-Null
  Add-DiagramObject -Diagram $diagram -Element $r["Reopened"] -Left 315 -Top 225 -Width 130 -Height 55 | Out-Null
  Add-DiagramObject -Diagram $diagram -Element $r["Deleted"] -Left 675 -Top 225 -Width 120 -Height 55 | Out-Null
  Add-DiagramObject -Diagram $diagram -Element $r["End"] -Left 875 -Top 225 -Width 60 -Height 45 | Out-Null

  Add-StateFlow -Diagram $diagram -Source $r["Start"] -Target $r["Draft"] | Out-Null
  Add-StateFlow -Diagram $diagram -Source $r["Draft"] -Target $r["Unread"] -Name "submit / save" | Out-Null
  Add-StateFlow -Diagram $diagram -Source $r["Unread"] -Target $r["Read"] -Name "admin reads" | Out-Null
  Add-StateFlow -Diagram $diagram -Source $r["Read"] -Target $r["Replied"] -Name "admin replies" | Out-Null
  Add-StateFlow -Diagram $diagram -Source $r["Replied"] -Target $r["Resolved"] -Name "mark resolved" | Out-Null
  Add-StateFlow -Diagram $diagram -Source $r["Resolved"] -Target $r["Reopened"] -Name "user follows up" | Out-Null
  Add-StateFlow -Diagram $diagram -Source $r["Reopened"] -Target $r["Unread"] -Name "return to pending" | Out-Null
  Add-StateFlow -Diagram $diagram -Source $r["Read"] -Target $r["Deleted"] -Name "admin deletes" | Out-Null
  Add-StateFlow -Diagram $diagram -Source $r["Resolved"] -Target $r["Deleted"] -Name "admin deletes" | Out-Null
  Add-StateFlow -Diagram $diagram -Source $r["Deleted"] -Target $r["End"] | Out-Null

  [void]$diagram.Update()
  return $diagram
}

function Build-SimpleStateModel {
  param($Repository)

  $root = Get-RootModel -Repository $Repository
  $modelPackage = Add-Package -ParentPackage $root -Name "Haikou Guide Simple State Diagrams"
  $modelPackage.Notes = "Generated by create-simple-state-diagrams-ea.ps1 through Enterprise Architect COM."
  [void]$modelPackage.Update()

  $statePackage = Add-Package -ParentPackage $modelPackage -Name "Simple State Diagrams"
  $commentDiagram = Add-CommentStateDiagram -Package $statePackage
  $recommendDiagram = Add-RecommendStateDiagram -Package $statePackage
  $feedbackDiagram = Add-FeedbackStateDiagramSimple -Package $statePackage

  foreach ($diagram in @($commentDiagram, $recommendDiagram, $feedbackDiagram)) {
    $Repository.SaveDiagram($diagram.DiagramID)
    $Repository.ReloadDiagram($diagram.DiagramID)
  }
  $Repository.RefreshModelView($modelPackage.PackageID)

  return @{
    CommentDiagram = $commentDiagram
    RecommendDiagram = $recommendDiagram
    FeedbackDiagram = $feedbackDiagram
    ModelPackage = $modelPackage
  }
}

$repository = $null
try {
  $repository = New-Object -ComObject EA.Repository
  $modelPath = New-EaModelFile -Repository $repository -PrimaryPath $qeaPath -FallbackPath $eapxPath
  [void]$repository.OpenFile($modelPath)
  $result = Build-SimpleStateModel -Repository $repository

  $project = $repository.GetProjectInterface()
  Move-ExistingFileToBackup -Path $commentPngPath
  Move-ExistingFileToBackup -Path $recommendPngPath
  Move-ExistingFileToBackup -Path $feedbackPngPath
  [void]$project.PutDiagramImageToFile($project.GUIDtoXML($result.CommentDiagram.DiagramGUID), $commentPngPath, 1)
  [void]$project.PutDiagramImageToFile($project.GUIDtoXML($result.RecommendDiagram.DiagramGUID), $recommendPngPath, 1)
  [void]$project.PutDiagramImageToFile($project.GUIDtoXML($result.FeedbackDiagram.DiagramGUID), $feedbackPngPath, 1)
  [void]$repository.CloseFile()
  [void]$repository.Exit()
  $repository = $null

  if (Test-Path -LiteralPath $eaExePath) {
    Start-Process -FilePath $eaExePath -ArgumentList "`"$modelPath`"" -WindowStyle Normal | Out-Null
  } else {
    Start-Process -FilePath $modelPath -WindowStyle Normal | Out-Null
  }

  Write-Host "EA model file: $modelPath"
  Write-Host "Exported diagram image: $commentPngPath"
  Write-Host "Exported diagram image: $recommendPngPath"
  Write-Host "Exported diagram image: $feedbackPngPath"
  Write-Host "Diagram names: 12 State - Comment; 13 State - RecommendedPlace; 14 State - Feedback"
} finally {
  if ($repository -ne $null) {
    try { [void]$repository.CloseFile() } catch {}
    try { [void]$repository.Exit() } catch {}
  }
}
