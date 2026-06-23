$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$modelBaseName = "haikou-guide-comment-image-class-rectangles"
$qeaPath = Join-Path $scriptDir "$modelBaseName.qea"
$eapxPath = Join-Path $scriptDir "$modelBaseName.eapx"
$pngPath = Join-Path $scriptDir "02_类图_地点评论与图片互动_矩形版.png"
$eaExePath = "D:\EA.exe"

function Move-ExistingFileToBackup {
  param([string]$Path)
  if (-not (Test-Path -LiteralPath $Path)) { return }
  $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
  $directory = Split-Path -Parent $Path
  $name = [System.IO.Path]::GetFileNameWithoutExtension($Path)
  $extension = [System.IO.Path]::GetExtension($Path)
  $backupPath = Join-Path $directory "$name.$timestamp.bak$extension"
  Move-Item -LiteralPath $Path -Destination $backupPath -Force
  Write-Host "已备份旧文件: $backupPath"
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

function Add-RectClass {
  param(
    $Package,
    [hashtable]$Registry,
    [string]$Key,
    [string]$Name,
    [string]$Role,
    [string[]]$Attributes,
    [string[]]$Operations
  )

  $element = $Package.Elements.AddNew($Name, "Class")
  $element.Notes = "Role: $Role"
  [void]$element.Update()

  foreach ($attributeSpec in $Attributes) {
    $parts = $attributeSpec.Split(":", 2)
    $attributeName = $parts[0].Trim()
    $attributeType = $(if ($parts.Length -gt 1) { $parts[1].Trim() } else { "" })
    $attribute = $element.Attributes.AddNew($attributeName, $attributeType)
    $attribute.Visibility = "Public"
    [void]$attribute.Update()
  }

  foreach ($operationSpec in $Operations) {
    $operationName = $operationSpec.Trim() -replace "\(\)$", ""
    $method = $element.Methods.AddNew($operationName, "")
    $method.Visibility = "Public"
    [void]$method.Update()
  }

  $element.Attributes.Refresh()
  $element.Methods.Refresh()
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
  param(
    $Diagram,
    $Source,
    $Target,
    [string]$Type,
    [string]$Name = "",
    [string]$Stereotype = "",
    [string]$SourceRole = "",
    [string]$TargetRole = "",
    [string]$SourceCard = "",
    [string]$TargetCard = ""
  )

  $connector = $Source.Connectors.AddNew($Name, $Type)
  $connector.SupplierID = $Target.ElementID
  if ($Stereotype) { $connector.Stereotype = $Stereotype }
  if ($SourceRole) { $connector.ClientEnd.Role = $SourceRole }
  if ($TargetRole) { $connector.SupplierEnd.Role = $TargetRole }
  if ($SourceCard) { $connector.ClientEnd.Cardinality = $SourceCard }
  if ($TargetCard) { $connector.SupplierEnd.Cardinality = $TargetCard }
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
    Write-Host "创建 .qea 失败，准备尝试 .eapx: $($_.Exception.Message)"
  }
  if (-not [bool]$Repository.CreateModel(0, $FallbackPath, 0)) {
    throw "EA CreateModel 未能创建项目文件。"
  }
  return $FallbackPath
}

function Add-CommentImageRectangleClassDiagram {
  param($Package)

  $r = @{}
  $diagram = $Package.Diagrams.AddNew("02_类图_地点评论与图片互动_矩形版", "Logical")
  $diagram.Notes = "复刻原地点评论与图片互动类图内容，使用普通 UML 长方形类表示法，避免 entity/control 图标显示成圆形。"
  $diagram.cx = 1220
  $diagram.cy = 780
  [void]$diagram.Update()
  $Package.Diagrams.Refresh()

  Add-RectClass -Package $Package -Registry $r -Key "User" -Name "User" -Role "entity" -Attributes @(
    "id:int", "username:String", "phone:String", "avatarUrl:String"
  ) -Operations @(
    "login()", "uploadAvatar()", "viewNotifications()"
  ) | Out-Null

  Add-RectClass -Package $Package -Registry $r -Key "Place" -Name "Place" -Role "entity" -Attributes @(
    "id:String", "name:String", "type:String", "lat:Decimal", "lng:Decimal"
  ) -Operations @(
    "showDetail()", "showMapMarker()"
  ) | Out-Null

  Add-RectClass -Package $Package -Registry $r -Key "Comment" -Name "Comment" -Role "entity" -Attributes @(
    "id:int", "placeId:String", "userPhone:String", "content:Text", "imageUrl:JSON", "parentId:int", "createdAt:DateTime"
  ) -Operations @(
    "reply()", "deleteTree()"
  ) | Out-Null

  Add-RectClass -Package $Package -Registry $r -Key "CommentLike" -Name "CommentLike" -Role "entity" -Attributes @(
    "id:int", "phone:String", "commentId:int", "createdAt:DateTime"
  ) -Operations @(
    "toggle()"
  ) | Out-Null

  Add-RectClass -Package $Package -Registry $r -Key "UploadImage" -Name "UploadImage" -Role "value object" -Attributes @(
    "url:String", "thumbnail:String", "mimeType:String", "size:int"
  ) -Operations @(
    "validateSignature()", "toPublicUrl()"
  ) | Out-Null

  Add-RectClass -Package $Package -Registry $r -Key "Notification" -Name "Notification" -Role "entity" -Attributes @(
    "id:int", "receiverPhone:String", "senderPhone:String", "type:String", "placeId:String", "isRead:Boolean"
  ) -Operations @(
    "markRead()", "clear()"
  ) | Out-Null

  Add-RectClass -Package $Package -Registry $r -Key "CommentService" -Name "CommentService" -Role "control" -Attributes @(
    "pool:MySQLPool", "addNotice:Function"
  ) -Operations @(
    "listComments()", "addComment()", "toggleLike()", "deleteCommentTree()"
  ) | Out-Null

  Add-RectClass -Package $Package -Registry $r -Key "UploadService" -Name "UploadService" -Role "control" -Attributes @(
    "uploadDir:String", "maxSize:5MB"
  ) -Operations @(
    "createUploadMiddleware()", "validateUploadedImages()", "buildImagePayload()"
  ) | Out-Null

  Add-DiagramObject -Diagram $diagram -Element $r["CommentService"] -Left 430 -Top 720 -Width 260 -Height 140 | Out-Null
  Add-DiagramObject -Diagram $diagram -Element $r["UploadService"] -Left 790 -Top 720 -Width 270 -Height 140 | Out-Null

  Add-DiagramObject -Diagram $diagram -Element $r["User"] -Left 70 -Top 485 -Width 240 -Height 145 | Out-Null
  Add-DiagramObject -Diagram $diagram -Element $r["Place"] -Left 70 -Top 260 -Width 240 -Height 145 | Out-Null
  Add-DiagramObject -Diagram $diagram -Element $r["Comment"] -Left 430 -Top 420 -Width 310 -Height 190 | Out-Null
  Add-DiagramObject -Diagram $diagram -Element $r["UploadImage"] -Left 835 -Top 450 -Width 260 -Height 150 | Out-Null
  Add-DiagramObject -Diagram $diagram -Element $r["Notification"] -Left 835 -Top 225 -Width 280 -Height 160 | Out-Null
  Add-DiagramObject -Diagram $diagram -Element $r["CommentLike"] -Left 430 -Top 110 -Width 270 -Height 135 | Out-Null

  Add-Connector -Diagram $diagram -Source $r["User"] -Target $r["Comment"] -Type "Association" -Name "发表" -SourceCard "1" -TargetCard "0..*" | Out-Null
  Add-Connector -Diagram $diagram -Source $r["Place"] -Target $r["Comment"] -Type "Association" -Name "包含评论" -SourceCard "1" -TargetCard "0..*" | Out-Null
  Add-Connector -Diagram $diagram -Source $r["Comment"] -Target $r["Comment"] -Type "Association" -Name "回复" -SourceCard "0..1" -TargetCard "0..*" | Out-Null
  Add-Connector -Diagram $diagram -Source $r["Comment"] -Target $r["CommentLike"] -Type "Association" -Name "被点赞" -SourceCard "1" -TargetCard "0..*" | Out-Null
  Add-Connector -Diagram $diagram -Source $r["Comment"] -Target $r["UploadImage"] -Type "Aggregation" -Name "附带图片" -SourceCard "1" -TargetCard "0..9" | Out-Null
  Add-Connector -Diagram $diagram -Source $r["CommentService"] -Target $r["Comment"] -Type "Dependency" -Name "维护" | Out-Null
  Add-Connector -Diagram $diagram -Source $r["CommentService"] -Target $r["Notification"] -Type "Dependency" -Name "回复/点赞通知" | Out-Null
  Add-Connector -Diagram $diagram -Source $r["CommentService"] -Target $r["UploadService"] -Type "Dependency" -Name "校验图片" | Out-Null
  Add-Connector -Diagram $diagram -Source $r["UploadService"] -Target $r["UploadImage"] -Type "Dependency" -Name "生成" | Out-Null

  [void]$diagram.Update()
  return $diagram
}

function Build-RectangleClassModel {
  param($Repository)
  $root = Get-RootModel -Repository $Repository
  $modelPackage = Add-Package -ParentPackage $root -Name "海口旅行网站矩形类图模型"
  $modelPackage.Notes = "由 create-comment-image-class-rectangles-ea.ps1 调用本机 Enterprise Architect COM 自动生成。"
  [void]$modelPackage.Update()

  $classPackage = Add-Package -ParentPackage $modelPackage -Name "1_矩形类图"
  $diagram = Add-CommentImageRectangleClassDiagram -Package $classPackage
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
  Move-ExistingFileToBackup -Path $pngPath
  $repository = New-Object -ComObject EA.Repository
  $modelPath = New-EaModelFile -Repository $repository -PrimaryPath $qeaPath -FallbackPath $eapxPath
  [void]$repository.OpenFile($modelPath)
  $result = Build-RectangleClassModel -Repository $repository
  $project = $repository.GetProjectInterface()
  [void]$project.PutDiagramImageToFile($project.GUIDtoXML($result.Diagram.DiagramGUID), $pngPath, 1)

  Write-Host "EA 项目文件: $modelPath"
  Write-Host "导出截图文件: $pngPath"
  Write-Host "图名: 02_类图_地点评论与图片互动_矩形版"
} finally {
  if ($repository) {
    try { $repository.CloseFile() } catch {}
    try { $repository.Exit() } catch {}
    [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($repository)
  }
}

if (Test-Path -LiteralPath $eaExePath) {
  Start-Process -FilePath $eaExePath -ArgumentList "`"$modelPath`"" -WindowStyle Normal | Out-Null
} else {
  Start-Process -FilePath $modelPath -WindowStyle Normal | Out-Null
}



