$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$modelBaseName = "haikou-guide-simple-usecase"
$qeaPath = Join-Path $scriptDir "$modelBaseName.qea"
$eapxPath = Join-Path $scriptDir "$modelBaseName.eapx"
$pngPath = Join-Path $scriptDir "01_简化系统用例图.png"
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

function Add-Element {
  param($Package, [hashtable]$Registry, [string]$Key, [string]$Name, [string]$Type, [string]$Stereotype = "")
  $element = $Package.Elements.AddNew($Name, $Type)
  if ($Stereotype) {
    $element.Stereotype = $Stereotype
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

function Add-Connector {
  param($Diagram, $Source, $Target, [string]$Type, [string]$Stereotype = "")
  $connector = $Source.Connectors.AddNew("", $Type)
  $connector.SupplierID = $Target.ElementID
  if ($Stereotype) {
    $connector.Stereotype = $Stereotype
  }
  try {
    $connector.Direction = "Source -> Destination"
  } catch {
    # Older EA builds can ignore connector direction through COM; the link is still valid.
  }
  [void]$connector.Update()
  $Source.Connectors.Refresh()

  try {
    $link = $Diagram.DiagramLinks.AddNew("", "")
    $link.ConnectorID = $connector.ConnectorID
    [void]$link.Update()
    $Diagram.DiagramLinks.Refresh()
  } catch {
    # EA often displays newly created connectors automatically.
  }

  return $connector
}

function New-EaModelFile {
  param($Repository, [string]$PrimaryPath, [string]$FallbackPath)

  Move-ExistingFileToBackup -Path $PrimaryPath
  Move-ExistingFileToBackup -Path $FallbackPath

  $created = $false
  try {
    $created = [bool]$Repository.CreateModel(0, $PrimaryPath, 0)
    if ($created) {
      return $PrimaryPath
    }
  } catch {
    Write-Host "创建 .qea 失败，准备尝试 .eapx: $($_.Exception.Message)"
  }

  $created = [bool]$Repository.CreateModel(0, $FallbackPath, 0)
  if (-not $created) {
    throw "EA CreateModel 未能创建项目文件。"
  }
  return $FallbackPath
}

function Build-SimpleUseCaseModel {
  param($Repository)

  $root = Get-RootModel -Repository $Repository
  $modelPackage = Add-Package -ParentPackage $root -Name "海口旅行网站系统用例图_B简化版"
  $modelPackage.Notes = "由 create-simple-usecase-ea.ps1 调用本机 Enterprise Architect COM 自动生成。"
  [void]$modelPackage.Update()

  $useCasePackage = Add-Package -ParentPackage $modelPackage -Name "1_简化用例模型"
  $diagram = $useCasePackage.Diagrams.AddNew("01_简化系统用例图", "Use Case")
  $diagram.Notes = "面向课堂截图的简化系统用例图，按 ATM 示例保留少量核心用例和 include/extend 关系。"
  $diagram.cx = 1000
  $diagram.cy = 620
  [void]$diagram.Update()
  $useCasePackage.Diagrams.Refresh()

  $r = @{}
  Add-Element -Package $useCasePackage -Registry $r -Key "user" -Name "游客/用户" -Type "Actor" | Out-Null
  Add-Element -Package $useCasePackage -Registry $r -Key "admin" -Name "管理员" -Type "Actor" | Out-Null
  Add-Element -Package $useCasePackage -Registry $r -Key "external" -Name "短信/地图服务" -Type "Actor" -Stereotype "external" | Out-Null
  Add-Element -Package $useCasePackage -Registry $r -Key "boundary" -Name "海口旅行网站系统" -Type "Boundary" | Out-Null

  Add-Element -Package $useCasePackage -Registry $r -Key "browse" -Name "浏览景点" -Type "UseCase" | Out-Null
  Add-Element -Package $useCasePackage -Registry $r -Key "search" -Name "搜索筛选" -Type "UseCase" | Out-Null
  Add-Element -Package $useCasePackage -Registry $r -Key "detail" -Name "查看详情" -Type "UseCase" | Out-Null
  Add-Element -Package $useCasePackage -Registry $r -Key "route" -Name "地图导航" -Type "UseCase" | Out-Null
  Add-Element -Package $useCasePackage -Registry $r -Key "auth" -Name "用户认证" -Type "UseCase" | Out-Null
  Add-Element -Package $useCasePackage -Registry $r -Key "code" -Name "发送验证码" -Type "UseCase" | Out-Null
  Add-Element -Package $useCasePackage -Registry $r -Key "interact" -Name "互动/论坛" -Type "UseCase" | Out-Null
  Add-Element -Package $useCasePackage -Registry $r -Key "manage" -Name "后台管理" -Type "UseCase" | Out-Null

  Add-DiagramObject -Diagram $diagram -Element $r["boundary"] -Left 235 -Top 515 -Width 565 -Height 445 | Out-Null
  Add-DiagramObject -Diagram $diagram -Element $r["user"] -Left 55 -Top 370 -Width 95 -Height 105 | Out-Null
  Add-DiagramObject -Diagram $diagram -Element $r["admin"] -Left 55 -Top 160 -Width 95 -Height 105 | Out-Null
  Add-DiagramObject -Diagram $diagram -Element $r["external"] -Left 865 -Top 285 -Width 105 -Height 105 | Out-Null

  Add-DiagramObject -Diagram $diagram -Element $r["browse"] -Left 285 -Top 450 -Width 140 -Height 65 | Out-Null
  Add-DiagramObject -Diagram $diagram -Element $r["search"] -Left 500 -Top 450 -Width 140 -Height 65 | Out-Null
  Add-DiagramObject -Diagram $diagram -Element $r["detail"] -Left 285 -Top 325 -Width 140 -Height 65 | Out-Null
  Add-DiagramObject -Diagram $diagram -Element $r["route"] -Left 500 -Top 325 -Width 140 -Height 65 | Out-Null
  Add-DiagramObject -Diagram $diagram -Element $r["auth"] -Left 390 -Top 210 -Width 140 -Height 65 | Out-Null
  Add-DiagramObject -Diagram $diagram -Element $r["code"] -Left 610 -Top 210 -Width 140 -Height 65 | Out-Null
  Add-DiagramObject -Diagram $diagram -Element $r["interact"] -Left 285 -Top 105 -Width 140 -Height 65 | Out-Null
  Add-DiagramObject -Diagram $diagram -Element $r["manage"] -Left 500 -Top 105 -Width 140 -Height 65 | Out-Null

  Add-Connector -Diagram $diagram -Source $r["user"] -Target $r["browse"] -Type "Association" | Out-Null
  Add-Connector -Diagram $diagram -Source $r["user"] -Target $r["search"] -Type "Association" | Out-Null
  Add-Connector -Diagram $diagram -Source $r["user"] -Target $r["detail"] -Type "Association" | Out-Null
  Add-Connector -Diagram $diagram -Source $r["user"] -Target $r["route"] -Type "Association" | Out-Null
  Add-Connector -Diagram $diagram -Source $r["user"] -Target $r["auth"] -Type "Association" | Out-Null
  Add-Connector -Diagram $diagram -Source $r["user"] -Target $r["interact"] -Type "Association" | Out-Null
  Add-Connector -Diagram $diagram -Source $r["admin"] -Target $r["manage"] -Type "Association" | Out-Null
  Add-Connector -Diagram $diagram -Source $r["external"] -Target $r["code"] -Type "Association" | Out-Null
  Add-Connector -Diagram $diagram -Source $r["external"] -Target $r["route"] -Type "Association" | Out-Null

  Add-Connector -Diagram $diagram -Source $r["search"] -Target $r["browse"] -Type "Dependency" -Stereotype "extend" | Out-Null
  Add-Connector -Diagram $diagram -Source $r["detail"] -Target $r["browse"] -Type "Dependency" -Stereotype "extend" | Out-Null
  Add-Connector -Diagram $diagram -Source $r["route"] -Target $r["detail"] -Type "Dependency" -Stereotype "extend" | Out-Null
  Add-Connector -Diagram $diagram -Source $r["auth"] -Target $r["code"] -Type "Dependency" -Stereotype "include" | Out-Null
  Add-Connector -Diagram $diagram -Source $r["interact"] -Target $r["auth"] -Type "Dependency" -Stereotype "include" | Out-Null
  Add-Connector -Diagram $diagram -Source $r["manage"] -Target $r["auth"] -Type "Dependency" -Stereotype "include" | Out-Null

  [void]$diagram.Update()
  $Repository.SaveDiagram($diagram.DiagramID)
  $Repository.ReloadDiagram($diagram.DiagramID)
  $Repository.RefreshModelView($modelPackage.PackageID)
  return $diagram
}

$repository = $null
try {
  $repository = New-Object -ComObject EA.Repository
  $modelPath = New-EaModelFile -Repository $repository -PrimaryPath $qeaPath -FallbackPath $eapxPath
  [void]$repository.OpenFile($modelPath)
  $diagram = Build-SimpleUseCaseModel -Repository $repository

  $project = $repository.GetProjectInterface()
  $diagramGuidXml = $project.GUIDtoXML($diagram.DiagramGUID)
  [void]$project.PutDiagramImageToFile($diagramGuidXml, $pngPath, 1)
  [void]$repository.CloseFile()
  [void]$repository.Exit()
  $repository = $null

  if (Test-Path -LiteralPath $eaExePath) {
    Start-Process -FilePath $eaExePath -ArgumentList "`"$modelPath`"" -WindowStyle Normal | Out-Null
  } else {
    Start-Process -FilePath $modelPath -WindowStyle Normal | Out-Null
  }

  Write-Host "EA 项目文件: $modelPath"
  Write-Host "导出截图文件: $pngPath"
  Write-Host "图名: 01_简化系统用例图"
} finally {
  if ($repository -ne $null) {
    try { [void]$repository.CloseFile() } catch {}
    try { [void]$repository.Exit() } catch {}
  }
}

