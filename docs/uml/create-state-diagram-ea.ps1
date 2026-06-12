$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$modelBaseName = "haikou-guide-state-diagram"
$qeaPath = Join-Path $scriptDir "$modelBaseName.qea"
$eapxPath = Join-Path $scriptDir "$modelBaseName.eapx"
$statePngPath = Join-Path $scriptDir "07_状态图_反馈处理生命周期.png"
$eaExePath = "D:\EA.exe"

function Move-ExistingFileToBackup {
  param([string]$Path)
  if (-not (Test-Path -LiteralPath $Path)) {
    return
  }

  $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
  $directory = Split-Path -Parent $Path
  $name = [System.IO.Path]::GetFileNameWithoutExtension($Path)
  $extension = [System.IO.Path]::GetExtension($Path)
  $backupPath = Join-Path $directory "$name.$timestamp.bak$extension"
  Move-Item -LiteralPath $Path -Destination $backupPath
  Write-Host "已备份旧文件: $backupPath"
}

function Get-RootModel {
  param($Repository)
  if ($Repository.Models.Count -gt 0) {
    return $Repository.Models.GetAt(0)
  }

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
  try {
    $connector.Direction = "Source -> Destination"
  } catch {
  }
  [void]$connector.Update()
  $Source.Connectors.Refresh()

  try {
    $link = $Diagram.DiagramLinks.AddNew("", "")
    $link.ConnectorID = $connector.ConnectorID
    [void]$link.Update()
    $Diagram.DiagramLinks.Refresh()
  } catch {
  }

  return $connector
}

function New-EaModelFile {
  param($Repository, [string]$PrimaryPath, [string]$FallbackPath)

  Move-ExistingFileToBackup -Path $PrimaryPath
  Move-ExistingFileToBackup -Path $FallbackPath

  try {
    if ([bool]$Repository.CreateModel(0, $PrimaryPath, 0)) {
      return $PrimaryPath
    }
  } catch {
    Write-Host "创建 .qea 失败，准备尝试 .eapx: $($_.Exception.Message)"
  }

  if (-not [bool]$Repository.CreateModel(0, $FallbackPath, 0)) {
    throw "EA CreateModel 未能创建项目文件。"
  }
  return $FallbackPath
}

function Add-FeedbackStateDiagram {
  param($Package)

  $r = @{}
  $diagram = $Package.Diagrams.AddNew("07_状态图_反馈处理生命周期", "Statechart")
  $diagram.Notes = "展示用户反馈从草稿、提交、管理员处理到解决、补充回信和删除的生命周期。"
  $diagram.cx = 950
  $diagram.cy = 680
  [void]$diagram.Update()
  $Package.Diagrams.Refresh()

  Add-StateNode -Package $Package -Registry $r -Key "Start" -Name "开始" -Subtype 0 | Out-Null
  Add-State -Package $Package -Registry $r -Key "Draft" -Name "草稿" | Out-Null
  Add-State -Package $Package -Registry $r -Key "Submitted" -Name "已提交" | Out-Null
  Add-State -Package $Package -Registry $r -Key "Unread" -Name "未读" | Out-Null
  Add-State -Package $Package -Registry $r -Key "Read" -Name "已读" | Out-Null
  Add-State -Package $Package -Registry $r -Key "Replied" -Name "已回复" | Out-Null
  Add-State -Package $Package -Registry $r -Key "Resolved" -Name "已解决" | Out-Null
  Add-State -Package $Package -Registry $r -Key "Followup" -Name "用户补充回信" | Out-Null
  Add-State -Package $Package -Registry $r -Key "Deleted" -Name "已删除" | Out-Null
  Add-StateNode -Package $Package -Registry $r -Key "End" -Name "结束" -Subtype 1 | Out-Null

  Add-DiagramObject -Diagram $diagram -Element $r["Start"] -Left 50 -Top 430 -Width 70 -Height 45 | Out-Null
  Add-DiagramObject -Diagram $diagram -Element $r["Draft"] -Left 155 -Top 430 -Width 120 -Height 55 | Out-Null
  Add-DiagramObject -Diagram $diagram -Element $r["Submitted"] -Left 330 -Top 430 -Width 125 -Height 55 | Out-Null
  Add-DiagramObject -Diagram $diagram -Element $r["Unread"] -Left 505 -Top 430 -Width 120 -Height 55 | Out-Null
  Add-DiagramObject -Diagram $diagram -Element $r["Read"] -Left 680 -Top 430 -Width 120 -Height 55 | Out-Null
  Add-DiagramObject -Diagram $diagram -Element $r["Replied"] -Left 505 -Top 285 -Width 120 -Height 55 | Out-Null
  Add-DiagramObject -Diagram $diagram -Element $r["Resolved"] -Left 680 -Top 285 -Width 120 -Height 55 | Out-Null
  Add-DiagramObject -Diagram $diagram -Element $r["Followup"] -Left 330 -Top 285 -Width 150 -Height 55 | Out-Null
  Add-DiagramObject -Diagram $diagram -Element $r["Deleted"] -Left 505 -Top 145 -Width 120 -Height 55 | Out-Null
  Add-DiagramObject -Diagram $diagram -Element $r["End"] -Left 700 -Top 145 -Width 70 -Height 45 | Out-Null

  Add-StateFlow -Diagram $diagram -Source $r["Start"] -Target $r["Draft"] | Out-Null
  Add-StateFlow -Diagram $diagram -Source $r["Draft"] -Target $r["Submitted"] -Name "填写内容并提交" | Out-Null
  Add-StateFlow -Diagram $diagram -Source $r["Submitted"] -Target $r["Unread"] -Name "写入 feedback 表" | Out-Null
  Add-StateFlow -Diagram $diagram -Source $r["Unread"] -Target $r["Read"] -Name "管理员查看/标记已读" | Out-Null
  Add-StateFlow -Diagram $diagram -Source $r["Read"] -Target $r["Replied"] -Name "管理员回信" | Out-Null
  Add-StateFlow -Diagram $diagram -Source $r["Replied"] -Target $r["Resolved"] -Name "标记解决" | Out-Null
  Add-StateFlow -Diagram $diagram -Source $r["Resolved"] -Target $r["Followup"] -Name "用户继续回信" | Out-Null
  Add-StateFlow -Diagram $diagram -Source $r["Followup"] -Target $r["Unread"] -Name "重新待处理" | Out-Null
  Add-StateFlow -Diagram $diagram -Source $r["Read"] -Target $r["Deleted"] -Name "删除已读反馈" | Out-Null
  Add-StateFlow -Diagram $diagram -Source $r["Resolved"] -Target $r["Deleted"] -Name "删除已解决反馈" | Out-Null
  Add-StateFlow -Diagram $diagram -Source $r["Deleted"] -Target $r["End"] | Out-Null

  [void]$diagram.Update()
  return $diagram
}

function Build-StateModel {
  param($Repository)

  $root = Get-RootModel -Repository $Repository
  $modelPackage = Add-Package -ParentPackage $root -Name "海口旅行网站状态图模型"
  $modelPackage.Notes = "由 create-state-diagram-ea.ps1 调用本机 Enterprise Architect COM 自动生成。"
  [void]$modelPackage.Update()

  $statePackage = Add-Package -ParentPackage $modelPackage -Name "1_反馈状态图"
  $diagram = Add-FeedbackStateDiagram -Package $statePackage

  $Repository.SaveDiagram($diagram.DiagramID)
  $Repository.ReloadDiagram($diagram.DiagramID)
  $Repository.RefreshModelView($modelPackage.PackageID)

  return @{
    Diagram = $diagram
    ModelPackage = $modelPackage
  }
}

$repository = $null
try {
  $repository = New-Object -ComObject EA.Repository
  $modelPath = New-EaModelFile -Repository $repository -PrimaryPath $qeaPath -FallbackPath $eapxPath
  [void]$repository.OpenFile($modelPath)
  $result = Build-StateModel -Repository $repository

  $project = $repository.GetProjectInterface()
  $diagramGuidXml = $project.GUIDtoXML($result.Diagram.DiagramGUID)
  [void]$project.PutDiagramImageToFile($diagramGuidXml, $statePngPath, 1)
  [void]$repository.CloseFile()
  [void]$repository.Exit()
  $repository = $null

  if (Test-Path -LiteralPath $eaExePath) {
    Start-Process -FilePath $eaExePath -ArgumentList "`"$modelPath`"" -WindowStyle Normal | Out-Null
  } else {
    Start-Process -FilePath $modelPath -WindowStyle Normal | Out-Null
  }

  Write-Host "EA 项目文件: $modelPath"
  Write-Host "导出截图文件: $statePngPath"
  Write-Host "图名: 07_状态图_反馈处理生命周期"
} finally {
  if ($repository -ne $null) {
    try { [void]$repository.CloseFile() } catch {}
    try { [void]$repository.Exit() } catch {}
  }
}

