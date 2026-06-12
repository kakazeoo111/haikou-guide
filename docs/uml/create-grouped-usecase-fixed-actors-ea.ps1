$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$modelBaseName = "haikou-guide-grouped-usecase-fixed-actors"
$qeaPath = Join-Path $scriptDir "$modelBaseName.qea"
$eapxPath = Join-Path $scriptDir "$modelBaseName.eapx"
$simplePngPath = Join-Path $scriptDir "01_简化系统用例图_修正版.png"
$publicPngPath = Join-Path $scriptDir "02_用例图_注册用户互动功能_修正版.png"
$externalPngPath = Join-Path $scriptDir "04_用例图_外部服务支持_修正版.png"

function Move-ExistingFileToBackup {
  param([string]$Path)
  if (-not (Test-Path -LiteralPath $Path)) { return }
  $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
  $backupPath = "$Path.$timestamp.bak"
  Move-Item -LiteralPath $Path -Destination $backupPath -Force
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
  param(
    $Package,
    [hashtable]$Registry,
    [string]$Key,
    [string]$Name,
    [string]$Type,
    [string]$Stereotype = ""
  )
  $element = $Package.Elements.AddNew($Name, $Type)
  if ($Stereotype) { $element.Stereotype = $Stereotype }
  [void]$element.Update()
  $Package.Elements.Refresh()
  $Registry[$Key] = $element
  return $element
}

function Add-Actor {
  param(
    $Package,
    [hashtable]$Registry,
    [string]$Key,
    [string]$DisplayName,
    [string]$Stereotype = ""
  )
  $element = $Package.Elements.AddNew(" ", "Actor")
  if ($Stereotype) { $element.Stereotype = $Stereotype }
  $element.Alias = $DisplayName
  $element.Notes = $DisplayName
  [void]$element.Update()
  $Package.Elements.Refresh()
  $Registry[$Key] = $element
  return $element
}

function Add-Diagram {
  param($Package, [string]$Name, [string]$Notes)
  $diagram = $Package.Diagrams.AddNew($Name, "Use Case")
  $diagram.Notes = $Notes
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

function Add-TextLabel {
  param($Package, $Diagram, [string]$Text, [int]$Left, [int]$Top, [int]$Width = 150, [int]$Height = 30)
  $label = $Package.Elements.AddNew($Text, "Text")
  $label.Notes = $Text
  [void]$label.Update()
  $Package.Elements.Refresh()
  Add-DiagramObject -Diagram $Diagram -Element $label -Left $Left -Top $Top -Width $Width -Height $Height | Out-Null
  return $label
}

function Add-Connector {
  param(
    $Diagram,
    $Source,
    $Target,
    [string]$Type,
    [string]$Stereotype = "",
    [string]$Name = ""
  )
  $connector = $Source.Connectors.AddNew($Name, $Type)
  $connector.SupplierID = $Target.ElementID
  if ($Stereotype) { $connector.Stereotype = $Stereotype }
  [void]$connector.Update()
  $Source.Connectors.Refresh()
  try {
    $link = $Diagram.DiagramLinks.AddNew("", "")
    $link.ConnectorID = $connector.ConnectorID
    [void]$link.Update()
    $Diagram.DiagramLinks.Refresh()
  } catch {
    # EA may auto-create visible links for some connector types.
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

function Add-SimpleSystemUseCaseDiagram {
  param($Package)
  $r = @{}
  $diagram = Add-Diagram -Package $Package -Name "01_简化系统用例图" -Notes "按原简化系统用例图内容重新排版，仅放宽 Actor 显示框，避免参与者名称竖排。"

  Add-Actor -Package $Package -Registry $r -Key "user" -DisplayName "游客/用户" | Out-Null
  Add-Actor -Package $Package -Registry $r -Key "admin" -DisplayName "管理员" | Out-Null
  Add-Actor -Package $Package -Registry $r -Key "external" -DisplayName "短信/地图服务" -Stereotype "external" | Out-Null
  Add-Element -Package $Package -Registry $r -Key "boundary" -Name "海口旅行网站系统" -Type "Boundary" | Out-Null

  Add-Element -Package $Package -Registry $r -Key "browse" -Name "浏览景点" -Type "UseCase" | Out-Null
  Add-Element -Package $Package -Registry $r -Key "search" -Name "搜索筛选" -Type "UseCase" | Out-Null
  Add-Element -Package $Package -Registry $r -Key "detail" -Name "查看详情" -Type "UseCase" | Out-Null
  Add-Element -Package $Package -Registry $r -Key "route" -Name "地图导航" -Type "UseCase" | Out-Null
  Add-Element -Package $Package -Registry $r -Key "auth" -Name "用户认证" -Type "UseCase" | Out-Null
  Add-Element -Package $Package -Registry $r -Key "code" -Name "发送验证码" -Type "UseCase" | Out-Null
  Add-Element -Package $Package -Registry $r -Key "interact" -Name "互动/论坛" -Type "UseCase" | Out-Null
  Add-Element -Package $Package -Registry $r -Key "manage" -Name "后台管理" -Type "UseCase" | Out-Null

  Add-DiagramObject -Diagram $diagram -Element $r["boundary"] -Left 250 -Top 520 -Width 585 -Height 455 | Out-Null
  Add-DiagramObject -Diagram $diagram -Element $r["user"] -Left 75 -Top 390 -Width 70 -Height 120 | Out-Null
  Add-DiagramObject -Diagram $diagram -Element $r["admin"] -Left 75 -Top 170 -Width 70 -Height 120 | Out-Null
  Add-DiagramObject -Diagram $diagram -Element $r["external"] -Left 925 -Top 315 -Width 70 -Height 120 | Out-Null
  Add-TextLabel -Package $Package -Diagram $diagram -Text "游客/用户" -Left 35 -Top 245 -Width 160 -Height 34 | Out-Null
  Add-TextLabel -Package $Package -Diagram $diagram -Text "管理员" -Left 40 -Top 25 -Width 150 -Height 34 | Out-Null
  Add-TextLabel -Package $Package -Diagram $diagram -Text "短信/地图服务" -Left 870 -Top 170 -Width 190 -Height 34 | Out-Null

  Add-DiagramObject -Diagram $diagram -Element $r["browse"] -Left 300 -Top 460 -Width 150 -Height 70 | Out-Null
  Add-DiagramObject -Diagram $diagram -Element $r["search"] -Left 535 -Top 460 -Width 150 -Height 70 | Out-Null
  Add-DiagramObject -Diagram $diagram -Element $r["detail"] -Left 300 -Top 330 -Width 150 -Height 70 | Out-Null
  Add-DiagramObject -Diagram $diagram -Element $r["route"] -Left 535 -Top 330 -Width 150 -Height 70 | Out-Null
  Add-DiagramObject -Diagram $diagram -Element $r["auth"] -Left 420 -Top 215 -Width 150 -Height 70 | Out-Null
  Add-DiagramObject -Diagram $diagram -Element $r["code"] -Left 655 -Top 215 -Width 150 -Height 70 | Out-Null
  Add-DiagramObject -Diagram $diagram -Element $r["interact"] -Left 300 -Top 105 -Width 150 -Height 70 | Out-Null
  Add-DiagramObject -Diagram $diagram -Element $r["manage"] -Left 535 -Top 105 -Width 150 -Height 70 | Out-Null

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
  return $diagram
}

function Add-RegisteredUserUseCaseDiagram {
  param($Package)
  $r = @{}
  $diagram = Add-Diagram -Package $Package -Name "02_用例图_注册用户互动功能" -Notes "按截图中的注册用户互动用例图内容重新排版，仅放宽参与者显示框。"

  Add-Actor -Package $Package -Registry $r -Key "user" -DisplayName "游客/用户" | Out-Null
  Add-Actor -Package $Package -Registry $r -Key "sms" -DisplayName "短信服务" -Stereotype "external" | Out-Null
  Add-Actor -Package $Package -Registry $r -Key "map" -DisplayName "地图服务" -Stereotype "external" | Out-Null
  Add-Element -Package $Package -Registry $r -Key "boundary" -Name "海口旅行网站系统" -Type "Boundary" | Out-Null

  Add-Element -Package $Package -Registry $r -Key "reset" -Name "重置密码" -Type "UseCase" | Out-Null
  Add-Element -Package $Package -Registry $r -Key "register" -Name "注册账号" -Type "UseCase" | Out-Null
  Add-Element -Package $Package -Registry $r -Key "sendCode" -Name "发送验证码" -Type "UseCase" | Out-Null
  Add-Element -Package $Package -Registry $r -Key "login" -Name "登录系统" -Type "UseCase" | Out-Null
  Add-Element -Package $Package -Registry $r -Key "route" -Name "路线导航/规划" -Type "UseCase" | Out-Null
  Add-Element -Package $Package -Registry $r -Key "detail" -Name "查看地点详情" -Type "UseCase" | Out-Null
  Add-Element -Package $Package -Registry $r -Key "mapMark" -Name "查看地图标记" -Type "UseCase" | Out-Null
  Add-Element -Package $Package -Registry $r -Key "browse" -Name "浏览地点列表" -Type "UseCase" | Out-Null
  Add-Element -Package $Package -Registry $r -Key "search" -Name "搜索/筛选地点" -Type "UseCase" | Out-Null

  Add-DiagramObject -Diagram $diagram -Element $r["boundary"] -Left 260 -Top 545 -Width 640 -Height 465 | Out-Null
  Add-DiagramObject -Diagram $diagram -Element $r["user"] -Left 80 -Top 365 -Width 70 -Height 120 | Out-Null
  Add-DiagramObject -Diagram $diagram -Element $r["sms"] -Left 995 -Top 480 -Width 70 -Height 120 | Out-Null
  Add-DiagramObject -Diagram $diagram -Element $r["map"] -Left 995 -Top 225 -Width 70 -Height 120 | Out-Null
  Add-TextLabel -Package $Package -Diagram $diagram -Text "游客/用户" -Left 35 -Top 220 -Width 160 -Height 34 | Out-Null
  Add-TextLabel -Package $Package -Diagram $diagram -Text "短信服务" -Left 955 -Top 335 -Width 150 -Height 34 | Out-Null
  Add-TextLabel -Package $Package -Diagram $diagram -Text "地图服务" -Left 955 -Top 80 -Width 150 -Height 34 | Out-Null

  Add-DiagramObject -Diagram $diagram -Element $r["reset"] -Left 320 -Top 490 -Width 160 -Height 70 | Out-Null
  Add-DiagramObject -Diagram $diagram -Element $r["sendCode"] -Left 565 -Top 490 -Width 160 -Height 70 | Out-Null
  Add-DiagramObject -Diagram $diagram -Element $r["register"] -Left 320 -Top 390 -Width 160 -Height 70 | Out-Null
  Add-DiagramObject -Diagram $diagram -Element $r["login"] -Left 565 -Top 390 -Width 160 -Height 70 | Out-Null
  Add-DiagramObject -Diagram $diagram -Element $r["route"] -Left 690 -Top 300 -Width 175 -Height 70 | Out-Null
  Add-DiagramObject -Diagram $diagram -Element $r["detail"] -Left 320 -Top 275 -Width 175 -Height 70 | Out-Null
  Add-DiagramObject -Diagram $diagram -Element $r["mapMark"] -Left 565 -Top 235 -Width 175 -Height 70 | Out-Null
  Add-DiagramObject -Diagram $diagram -Element $r["browse"] -Left 320 -Top 150 -Width 175 -Height 70 | Out-Null
  Add-DiagramObject -Diagram $diagram -Element $r["search"] -Left 565 -Top 150 -Width 175 -Height 70 | Out-Null

  Add-Connector -Diagram $diagram -Source $r["user"] -Target $r["reset"] -Type "Association" | Out-Null
  Add-Connector -Diagram $diagram -Source $r["user"] -Target $r["register"] -Type "Association" | Out-Null
  Add-Connector -Diagram $diagram -Source $r["user"] -Target $r["login"] -Type "Association" | Out-Null
  Add-Connector -Diagram $diagram -Source $r["user"] -Target $r["detail"] -Type "Association" | Out-Null
  Add-Connector -Diagram $diagram -Source $r["user"] -Target $r["browse"] -Type "Association" | Out-Null
  Add-Connector -Diagram $diagram -Source $r["sms"] -Target $r["sendCode"] -Type "Association" | Out-Null
  Add-Connector -Diagram $diagram -Source $r["map"] -Target $r["route"] -Type "Association" | Out-Null
  Add-Connector -Diagram $diagram -Source $r["map"] -Target $r["mapMark"] -Type "Association" | Out-Null

  Add-Connector -Diagram $diagram -Source $r["reset"] -Target $r["sendCode"] -Type "Dependency" -Stereotype "include" | Out-Null
  Add-Connector -Diagram $diagram -Source $r["register"] -Target $r["sendCode"] -Type "Dependency" -Stereotype "include" | Out-Null
  Add-Connector -Diagram $diagram -Source $r["detail"] -Target $r["route"] -Type "Dependency" -Stereotype "extend" | Out-Null
  Add-Connector -Diagram $diagram -Source $r["detail"] -Target $r["mapMark"] -Type "Dependency" -Stereotype "extend" | Out-Null
  Add-Connector -Diagram $diagram -Source $r["search"] -Target $r["browse"] -Type "Dependency" -Stereotype "extend" | Out-Null

  [void]$diagram.Update()
  return $diagram
}

function Add-ExternalServiceUseCaseDiagram {
  param($Package)
  $r = @{}
  $diagram = Add-Diagram -Package $Package -Name "04_用例图_外部服务支持" -Notes "按截图中的外部服务支持用例图内容重新排版，仅放宽参与者显示框。"

  Add-Actor -Package $Package -Registry $r -Key "user" -DisplayName "游客/注册用户" | Out-Null
  Add-Actor -Package $Package -Registry $r -Key "map" -DisplayName "地图服务" -Stereotype "external" | Out-Null
  Add-Actor -Package $Package -Registry $r -Key "sms" -DisplayName "短信服务" -Stereotype "external" | Out-Null
  Add-Element -Package $Package -Registry $r -Key "boundary" -Name "海口旅行网站系统" -Type "Boundary" | Out-Null

  Add-Element -Package $Package -Registry $r -Key "poi" -Name "检索POI定位" -Type "UseCase" | Out-Null
  Add-Element -Package $Package -Registry $r -Key "nav" -Name "生成导航链接" -Type "UseCase" | Out-Null
  Add-Element -Package $Package -Registry $r -Key "marker" -Name "渲染地图标记" -Type "UseCase" | Out-Null
  Add-Element -Package $Package -Registry $r -Key "location" -Name "获取用户当前位置" -Type "UseCase" | Out-Null
  Add-Element -Package $Package -Registry $r -Key "preview" -Name "路线预览" -Type "UseCase" | Out-Null
  Add-Element -Package $Package -Registry $r -Key "verify" -Name "校验验证码" -Type "UseCase" | Out-Null
  Add-Element -Package $Package -Registry $r -Key "sendRegister" -Name "发送注册验证码" -Type "UseCase" | Out-Null
  Add-Element -Package $Package -Registry $r -Key "sendReset" -Name "发送重置验证码" -Type "UseCase" | Out-Null

  Add-DiagramObject -Diagram $diagram -Element $r["boundary"] -Left 320 -Top 525 -Width 640 -Height 435 | Out-Null
  Add-DiagramObject -Diagram $diagram -Element $r["user"] -Left 95 -Top 355 -Width 70 -Height 125 | Out-Null
  Add-DiagramObject -Diagram $diagram -Element $r["map"] -Left 1055 -Top 455 -Width 70 -Height 120 | Out-Null
  Add-DiagramObject -Diagram $diagram -Element $r["sms"] -Left 1055 -Top 260 -Width 70 -Height 120 | Out-Null
  Add-TextLabel -Package $Package -Diagram $diagram -Text "游客/注册用户" -Left 35 -Top 200 -Width 210 -Height 34 | Out-Null
  Add-TextLabel -Package $Package -Diagram $diagram -Text "地图服务" -Left 1015 -Top 310 -Width 150 -Height 34 | Out-Null
  Add-TextLabel -Package $Package -Diagram $diagram -Text "短信服务" -Left 1015 -Top 115 -Width 150 -Height 34 | Out-Null

  Add-DiagramObject -Diagram $diagram -Element $r["poi"] -Left 385 -Top 455 -Width 170 -Height 72 | Out-Null
  Add-DiagramObject -Diagram $diagram -Element $r["nav"] -Left 615 -Top 455 -Width 170 -Height 72 | Out-Null
  Add-DiagramObject -Diagram $diagram -Element $r["marker"] -Left 385 -Top 350 -Width 170 -Height 72 | Out-Null
  Add-DiagramObject -Diagram $diagram -Element $r["location"] -Left 590 -Top 350 -Width 190 -Height 72 | Out-Null
  Add-DiagramObject -Diagram $diagram -Element $r["preview"] -Left 765 -Top 240 -Width 170 -Height 72 | Out-Null
  Add-DiagramObject -Diagram $diagram -Element $r["verify"] -Left 500 -Top 225 -Width 170 -Height 72 | Out-Null
  Add-DiagramObject -Diagram $diagram -Element $r["sendRegister"] -Left 385 -Top 110 -Width 190 -Height 72 | Out-Null
  Add-DiagramObject -Diagram $diagram -Element $r["sendReset"] -Left 620 -Top 110 -Width 190 -Height 72 | Out-Null

  Add-Connector -Diagram $diagram -Source $r["user"] -Target $r["poi"] -Type "Association" | Out-Null
  Add-Connector -Diagram $diagram -Source $r["user"] -Target $r["nav"] -Type "Association" | Out-Null
  Add-Connector -Diagram $diagram -Source $r["user"] -Target $r["marker"] -Type "Association" | Out-Null
  Add-Connector -Diagram $diagram -Source $r["user"] -Target $r["location"] -Type "Association" | Out-Null
  Add-Connector -Diagram $diagram -Source $r["user"] -Target $r["preview"] -Type "Association" | Out-Null
  Add-Connector -Diagram $diagram -Source $r["user"] -Target $r["sendRegister"] -Type "Association" | Out-Null
  Add-Connector -Diagram $diagram -Source $r["user"] -Target $r["sendReset"] -Type "Association" | Out-Null
  Add-Connector -Diagram $diagram -Source $r["map"] -Target $r["poi"] -Type "Association" | Out-Null
  Add-Connector -Diagram $diagram -Source $r["map"] -Target $r["nav"] -Type "Association" | Out-Null
  Add-Connector -Diagram $diagram -Source $r["map"] -Target $r["marker"] -Type "Association" | Out-Null
  Add-Connector -Diagram $diagram -Source $r["map"] -Target $r["location"] -Type "Association" | Out-Null
  Add-Connector -Diagram $diagram -Source $r["map"] -Target $r["preview"] -Type "Association" | Out-Null
  Add-Connector -Diagram $diagram -Source $r["sms"] -Target $r["sendRegister"] -Type "Association" | Out-Null
  Add-Connector -Diagram $diagram -Source $r["sms"] -Target $r["sendReset"] -Type "Association" | Out-Null

  Add-Connector -Diagram $diagram -Source $r["preview"] -Target $r["nav"] -Type "Dependency" -Stereotype "include" | Out-Null
  Add-Connector -Diagram $diagram -Source $r["preview"] -Target $r["location"] -Type "Dependency" -Stereotype "include" | Out-Null
  Add-Connector -Diagram $diagram -Source $r["poi"] -Target $r["location"] -Type "Dependency" -Stereotype "include" | Out-Null
  Add-Connector -Diagram $diagram -Source $r["sendRegister"] -Target $r["verify"] -Type "Dependency" -Stereotype "include" | Out-Null
  Add-Connector -Diagram $diagram -Source $r["sendReset"] -Target $r["verify"] -Type "Dependency" -Stereotype "include" | Out-Null

  [void]$diagram.Update()
  return $diagram
}

function Build-GroupedUseCaseModel {
  param($Repository)
  $root = Get-RootModel -Repository $Repository
  $modelPackage = Add-Package -ParentPackage $root -Name "海口旅行网站分组用例图_Actor修正版"
  $modelPackage.Notes = "由 create-grouped-usecase-fixed-actors-ea.ps1 调用本机 Enterprise Architect COM 自动生成。仅修正参与者图元宽度和布局，业务内容保持原分组用例图不变。"
  [void]$modelPackage.Update()

  $useCasePackage = Add-Package -ParentPackage $modelPackage -Name "1_分组用例图"
  $simpleDiagram = Add-SimpleSystemUseCaseDiagram -Package $useCasePackage
  $publicDiagram = Add-RegisteredUserUseCaseDiagram -Package $useCasePackage
  $externalDiagram = Add-ExternalServiceUseCaseDiagram -Package $useCasePackage

  $Repository.SaveDiagram($simpleDiagram.DiagramID)
  $Repository.SaveDiagram($publicDiagram.DiagramID)
  $Repository.SaveDiagram($externalDiagram.DiagramID)
  $Repository.ReloadDiagram($simpleDiagram.DiagramID)
  $Repository.ReloadDiagram($publicDiagram.DiagramID)
  $Repository.ReloadDiagram($externalDiagram.DiagramID)
  $Repository.RefreshModelView($modelPackage.PackageID)

  return @{
    SimpleDiagram = $simpleDiagram
    PublicDiagram = $publicDiagram
    ExternalDiagram = $externalDiagram
    ModelPackage = $modelPackage
  }
}

$repository = $null
try {
  Move-ExistingFileToBackup -Path $simplePngPath
  Move-ExistingFileToBackup -Path $publicPngPath
  Move-ExistingFileToBackup -Path $externalPngPath

  $repository = New-Object -ComObject EA.Repository
  $modelPath = New-EaModelFile -Repository $repository -PrimaryPath $qeaPath -FallbackPath $eapxPath
  [void]$repository.OpenFile($modelPath)
  $result = Build-GroupedUseCaseModel -Repository $repository
  $project = $repository.GetProjectInterface()

  [void]$project.PutDiagramImageToFile($project.GUIDtoXML($result.SimpleDiagram.DiagramGUID), $simplePngPath, 1)
  [void]$project.PutDiagramImageToFile($project.GUIDtoXML($result.PublicDiagram.DiagramGUID), $publicPngPath, 1)
  [void]$project.PutDiagramImageToFile($project.GUIDtoXML($result.ExternalDiagram.DiagramGUID), $externalPngPath, 1)

  Write-Host "EA 项目文件: $modelPath"
  Write-Host "导出截图文件: $simplePngPath"
  Write-Host "导出截图文件: $publicPngPath"
  Write-Host "导出截图文件: $externalPngPath"
  Write-Host "图名: 01_简化系统用例图"
  Write-Host "图名: 02_用例图_注册用户互动功能"
  Write-Host "图名: 04_用例图_外部服务支持"
} finally {
  if ($repository) {
    try { $repository.CloseFile() } catch {}
    try { $repository.Exit() } catch {}
    [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($repository)
  }
}



