$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$modelBaseName = "haikou-guide-activity-diagram"
$qeaPath = Join-Path $scriptDir "$modelBaseName.qea"
$eapxPath = Join-Path $scriptDir "$modelBaseName.eapx"
$activityPngPath = Join-Path $scriptDir "06_活动图_浏览与互动流程.png"
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
  if ($null -ne $subtype) {
    $element.Subtype = $subtype
  }
  [void]$element.Update()
  $Package.Elements.Refresh()
  $Registry[$Key] = $element
  return $element
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

function Add-HaikouGuideActivityDiagram {
  param($Package)

  $r = @{}
  $diagram = $Package.Diagrams.AddNew("06_活动图_浏览与互动流程", "Activity")
  $diagram.Notes = "展示海口旅行网站从打开、浏览、登录判断到评论、论坛、反馈和路线规划的主业务流程。"
  $diagram.cx = 980
  $diagram.cy = 980
  [void]$diagram.Update()
  $Package.Diagrams.Refresh()

  Add-ActivityElement -Package $Package -Registry $r -Key "Start" -Name "开始" -Type "ActivityInitial" | Out-Null
  Add-ActivityElement -Package $Package -Registry $r -Key "Open" -Name "打开海口旅行网站" -Type "Action" | Out-Null
  Add-ActivityElement -Package $Package -Registry $r -Key "Load" -Name "加载用户状态、定位、公告和景点数据" -Type "Action" | Out-Null
  Add-ActivityElement -Package $Package -Registry $r -Key "Browse" -Name "浏览景点列表" -Type "Action" | Out-Null
  Add-ActivityElement -Package $Package -Registry $r -Key "Search" -Name "搜索/筛选景点" -Type "Action" | Out-Null
  Add-ActivityElement -Package $Package -Registry $r -Key "Detail" -Name "查看景点详情和地图标记" -Type "Action" | Out-Null
  Add-ActivityElement -Package $Package -Registry $r -Key "LoginDecision" -Name "是否已登录？" -Type "Decision" | Out-Null
  Add-ActivityElement -Package $Package -Registry $r -Key "Auth" -Name "登录/注册/重置密码" -Type "Action" | Out-Null
  Add-ActivityElement -Package $Package -Registry $r -Key "Interact" -Name "收藏、点赞、评论/回复" -Type "Action" | Out-Null
  Add-ActivityElement -Package $Package -Registry $r -Key "Upload" -Name "上传并校验图片" -Type "Action" | Out-Null
  Add-ActivityElement -Package $Package -Registry $r -Key "Forum" -Name "论坛发帖、评论或打 call" -Type "Action" | Out-Null
  Add-ActivityElement -Package $Package -Registry $r -Key "Notice" -Name "系统生成互动通知" -Type "Action" | Out-Null
  Add-ActivityElement -Package $Package -Registry $r -Key "Feedback" -Name "提交反馈或查看回信" -Type "Action" | Out-Null
  Add-ActivityElement -Package $Package -Registry $r -Key "Route" -Name "选择收藏地点生成路线规划" -Type "Action" | Out-Null
  Add-ActivityElement -Package $Package -Registry $r -Key "ContinueDecision" -Name "继续互动？" -Type "Decision" | Out-Null
  Add-ActivityElement -Package $Package -Registry $r -Key "End" -Name "结束" -Type "ActivityFinal" | Out-Null

  Add-DiagramObject -Diagram $diagram -Element $r["Start"] -Left 445 -Top 890 -Width 80 -Height 45 | Out-Null
  Add-DiagramObject -Diagram $diagram -Element $r["Open"] -Left 395 -Top 805 -Width 180 -Height 55 | Out-Null
  Add-DiagramObject -Diagram $diagram -Element $r["Load"] -Left 355 -Top 710 -Width 260 -Height 60 | Out-Null
  Add-DiagramObject -Diagram $diagram -Element $r["Browse"] -Left 170 -Top 610 -Width 170 -Height 55 | Out-Null
  Add-DiagramObject -Diagram $diagram -Element $r["Search"] -Left 420 -Top 610 -Width 170 -Height 55 | Out-Null
  Add-DiagramObject -Diagram $diagram -Element $r["Detail"] -Left 670 -Top 610 -Width 210 -Height 55 | Out-Null
  Add-DiagramObject -Diagram $diagram -Element $r["LoginDecision"] -Left 420 -Top 500 -Width 160 -Height 65 | Out-Null
  Add-DiagramObject -Diagram $diagram -Element $r["Auth"] -Left 160 -Top 405 -Width 190 -Height 55 | Out-Null
  Add-DiagramObject -Diagram $diagram -Element $r["Interact"] -Left 410 -Top 405 -Width 200 -Height 55 | Out-Null
  Add-DiagramObject -Diagram $diagram -Element $r["Upload"] -Left 680 -Top 405 -Width 180 -Height 55 | Out-Null
  Add-DiagramObject -Diagram $diagram -Element $r["Forum"] -Left 165 -Top 285 -Width 220 -Height 55 | Out-Null
  Add-DiagramObject -Diagram $diagram -Element $r["Notice"] -Left 430 -Top 285 -Width 190 -Height 55 | Out-Null
  Add-DiagramObject -Diagram $diagram -Element $r["Feedback"] -Left 685 -Top 285 -Width 200 -Height 55 | Out-Null
  Add-DiagramObject -Diagram $diagram -Element $r["Route"] -Left 185 -Top 165 -Width 240 -Height 55 | Out-Null
  Add-DiagramObject -Diagram $diagram -Element $r["ContinueDecision"] -Left 500 -Top 160 -Width 160 -Height 65 | Out-Null
  Add-DiagramObject -Diagram $diagram -Element $r["End"] -Left 730 -Top 160 -Width 80 -Height 45 | Out-Null

  Add-ControlFlow -Diagram $diagram -Source $r["Start"] -Target $r["Open"] | Out-Null
  Add-ControlFlow -Diagram $diagram -Source $r["Open"] -Target $r["Load"] | Out-Null
  Add-ControlFlow -Diagram $diagram -Source $r["Load"] -Target $r["Browse"] | Out-Null
  Add-ControlFlow -Diagram $diagram -Source $r["Browse"] -Target $r["Search"] -Name "可选" | Out-Null
  Add-ControlFlow -Diagram $diagram -Source $r["Search"] -Target $r["Detail"] | Out-Null
  Add-ControlFlow -Diagram $diagram -Source $r["Browse"] -Target $r["Detail"] -Name "直接查看" | Out-Null
  Add-ControlFlow -Diagram $diagram -Source $r["Detail"] -Target $r["LoginDecision"] | Out-Null
  Add-ControlFlow -Diagram $diagram -Source $r["LoginDecision"] -Target $r["Auth"] -Name "否" | Out-Null
  Add-ControlFlow -Diagram $diagram -Source $r["Auth"] -Target $r["Interact"] -Name "登录成功" | Out-Null
  Add-ControlFlow -Diagram $diagram -Source $r["LoginDecision"] -Target $r["Interact"] -Name "是" | Out-Null
  Add-ControlFlow -Diagram $diagram -Source $r["Interact"] -Target $r["Upload"] -Name "带图片" | Out-Null
  Add-ControlFlow -Diagram $diagram -Source $r["Upload"] -Target $r["Notice"] | Out-Null
  Add-ControlFlow -Diagram $diagram -Source $r["Interact"] -Target $r["Notice"] -Name "文字互动" | Out-Null
  Add-ControlFlow -Diagram $diagram -Source $r["Notice"] -Target $r["Forum"] -Name "进入论坛" | Out-Null
  Add-ControlFlow -Diagram $diagram -Source $r["Forum"] -Target $r["Notice"] -Name "论坛互动通知" | Out-Null
  Add-ControlFlow -Diagram $diagram -Source $r["Notice"] -Target $r["Feedback"] -Name "查看/反馈" | Out-Null
  Add-ControlFlow -Diagram $diagram -Source $r["Feedback"] -Target $r["Route"] -Name "继续规划" | Out-Null
  Add-ControlFlow -Diagram $diagram -Source $r["Detail"] -Target $r["Route"] -Name "路线导航" | Out-Null
  Add-ControlFlow -Diagram $diagram -Source $r["Route"] -Target $r["ContinueDecision"] | Out-Null
  Add-ControlFlow -Diagram $diagram -Source $r["ContinueDecision"] -Target $r["Browse"] -Name "是" | Out-Null
  Add-ControlFlow -Diagram $diagram -Source $r["ContinueDecision"] -Target $r["End"] -Name "否" | Out-Null

  [void]$diagram.Update()
  return $diagram
}

function Build-ActivityModel {
  param($Repository)

  $root = Get-RootModel -Repository $Repository
  $modelPackage = Add-Package -ParentPackage $root -Name "海口旅行网站活动图模型"
  $modelPackage.Notes = "由 create-activity-diagram-ea.ps1 调用本机 Enterprise Architect COM 自动生成。"
  [void]$modelPackage.Update()

  $activityPackage = Add-Package -ParentPackage $modelPackage -Name "1_浏览与互动活动图"
  $diagram = Add-HaikouGuideActivityDiagram -Package $activityPackage

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
  $result = Build-ActivityModel -Repository $repository

  $project = $repository.GetProjectInterface()
  $diagramGuidXml = $project.GUIDtoXML($result.Diagram.DiagramGUID)
  [void]$project.PutDiagramImageToFile($diagramGuidXml, $activityPngPath, 1)
  [void]$repository.CloseFile()
  [void]$repository.Exit()
  $repository = $null

  if (Test-Path -LiteralPath $eaExePath) {
    Start-Process -FilePath $eaExePath -ArgumentList "`"$modelPath`"" -WindowStyle Normal | Out-Null
  } else {
    Start-Process -FilePath $modelPath -WindowStyle Normal | Out-Null
  }

  Write-Host "EA 项目文件: $modelPath"
  Write-Host "导出截图文件: $activityPngPath"
  Write-Host "图名: 06_活动图_浏览与互动流程"
} finally {
  if ($repository -ne $null) {
    try { [void]$repository.CloseFile() } catch {}
    try { [void]$repository.Exit() } catch {}
  }
}



