$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$modelBaseName = "haikou-guide-forum-notification-class-rectangles"
$qeaPath = Join-Path $scriptDir "$modelBaseName.qea"
$eapxPath = Join-Path $scriptDir "$modelBaseName.eapx"
$pngPath = Join-Path $scriptDir "03_类图_论坛与通知互动_矩形版.png"
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

function Add-ForumNotificationRectangleClassDiagram {
  param($Package)

  $r = @{}
  $diagram = $Package.Diagrams.AddNew("03_类图_论坛与通知互动_矩形版", "Logical")
  $diagram.Notes = "复刻原论坛与通知互动类图内容，使用普通 UML 长方形类表示法。"
  $diagram.cx = 1240
  $diagram.cy = 780
  [void]$diagram.Update()
  $Package.Diagrams.Refresh()

  Add-RectClass -Package $Package -Registry $r -Key "User" -Name "User" -Role "entity" -Attributes @(
    "id:int", "username:String", "phone:String", "avatarUrl:String"
  ) -Operations @(
    "publishPost()", "replyPost()", "callPost()"
  ) | Out-Null

  Add-RectClass -Package $Package -Registry $r -Key "ForumPost" -Name "ForumPost" -Role "entity" -Attributes @(
    "id:int", "userPhone:String", "content:Text", "imageUrl:JSON", "createdAt:DateTime"
  ) -Operations @(
    "publish()", "delete()", "isActive()"
  ) | Out-Null

  Add-RectClass -Package $Package -Registry $r -Key "ForumComment" -Name "ForumComment" -Role "entity" -Attributes @(
    "id:int", "postId:int", "parentId:int", "userPhone:String", "content:Text", "imageUrl:JSON", "createdAt:DateTime"
  ) -Operations @(
    "reply()", "deleteTree()"
  ) | Out-Null

  Add-RectClass -Package $Package -Registry $r -Key "ForumPostCall" -Name "ForumPostCall" -Role "entity" -Attributes @(
    "id:int", "postId:int", "userPhone:String", "createdAt:DateTime"
  ) -Operations @(
    "toggle()"
  ) | Out-Null

  Add-RectClass -Package $Package -Registry $r -Key "ForumCommentLike" -Name "ForumCommentLike" -Role "entity" -Attributes @(
    "id:int", "commentId:int", "userPhone:String", "createdAt:DateTime"
  ) -Operations @(
    "toggle()"
  ) | Out-Null

  Add-RectClass -Package $Package -Registry $r -Key "Notification" -Name "Notification" -Role "entity" -Attributes @(
    "id:int", "receiverPhone:String", "senderPhone:String", "type:String", "placeId:String", "content:Text", "isRead:Boolean"
  ) -Operations @(
    "markForumRead()", "clearForum()"
  ) | Out-Null

  Add-RectClass -Package $Package -Registry $r -Key "ForumService" -Name "ForumService" -Role "control" -Attributes @(
    "pool:MySQLPool", "noticeSender:Function"
  ) -Operations @(
    "listPosts()", "addPost()", "addComment()", "callPost()", "likeComment()", "deleteContent()"
  ) | Out-Null

  Add-RectClass -Package $Package -Registry $r -Key "NotificationService" -Name "NotificationService" -Role "control" -Attributes @(
    "forumTypes:String[]"
  ) -Operations @(
    "listNotifications()", "markForumRead()", "clearForum()"
  ) | Out-Null

  Add-DiagramObject -Diagram $diagram -Element $r["User"] -Left 60 -Top 435 -Width 240 -Height 145 | Out-Null
  Add-DiagramObject -Diagram $diagram -Element $r["ForumPost"] -Left 420 -Top 435 -Width 300 -Height 165 | Out-Null
  Add-DiagramObject -Diagram $diagram -Element $r["ForumComment"] -Left 420 -Top 690 -Width 330 -Height 190 | Out-Null
  Add-DiagramObject -Diagram $diagram -Element $r["ForumPostCall"] -Left 820 -Top 435 -Width 270 -Height 135 | Out-Null
  Add-DiagramObject -Diagram $diagram -Element $r["ForumCommentLike"] -Left 820 -Top 675 -Width 290 -Height 135 | Out-Null
  Add-DiagramObject -Diagram $diagram -Element $r["Notification"] -Left 820 -Top 165 -Width 300 -Height 175 | Out-Null
  Add-DiagramObject -Diagram $diagram -Element $r["ForumService"] -Left 55 -Top 150 -Width 300 -Height 185 | Out-Null
  Add-DiagramObject -Diagram $diagram -Element $r["NotificationService"] -Left 430 -Top 150 -Width 290 -Height 145 | Out-Null

  Add-Connector -Diagram $diagram -Source $r["User"] -Target $r["ForumPost"] -Type "Association" -Name "发布" -SourceCard "1" -TargetCard "0..*" | Out-Null
  Add-Connector -Diagram $diagram -Source $r["User"] -Target $r["ForumComment"] -Type "Association" -Name "评论/回复" -SourceCard "1" -TargetCard "0..*" | Out-Null
  Add-Connector -Diagram $diagram -Source $r["ForumPost"] -Target $r["ForumComment"] -Type "Composition" -Name "包含" -SourceCard "1" -TargetCard "0..*" | Out-Null
  Add-Connector -Diagram $diagram -Source $r["ForumComment"] -Target $r["ForumComment"] -Type "Association" -Name "楼中楼回复" -SourceCard "0..1" -TargetCard "0..*" | Out-Null
  Add-Connector -Diagram $diagram -Source $r["ForumPost"] -Target $r["ForumPostCall"] -Type "Association" -Name "被打call" -SourceCard "1" -TargetCard "0..*" | Out-Null
  Add-Connector -Diagram $diagram -Source $r["ForumComment"] -Target $r["ForumCommentLike"] -Type "Association" -Name "被点赞" -SourceCard "1" -TargetCard "0..*" | Out-Null
  Add-Connector -Diagram $diagram -Source $r["ForumService"] -Target $r["ForumPost"] -Type "Dependency" -Name "维护帖子" | Out-Null
  Add-Connector -Diagram $diagram -Source $r["ForumService"] -Target $r["ForumComment"] -Type "Dependency" -Name "维护评论" | Out-Null
  Add-Connector -Diagram $diagram -Source $r["ForumService"] -Target $r["NotificationService"] -Type "Dependency" -Name "创建互动通知" | Out-Null
  Add-Connector -Diagram $diagram -Source $r["NotificationService"] -Target $r["Notification"] -Type "Dependency" -Name "读写" | Out-Null

  [void]$diagram.Update()
  return $diagram
}

function Build-RectangleClassModel {
  param($Repository)
  $root = Get-RootModel -Repository $Repository
  $modelPackage = Add-Package -ParentPackage $root -Name "海口旅行网站论坛矩形类图模型"
  $modelPackage.Notes = "由 create-forum-notification-class-rectangles-ea.ps1 调用本机 Enterprise Architect COM 自动生成。"
  [void]$modelPackage.Update()

  $classPackage = Add-Package -ParentPackage $modelPackage -Name "1_矩形类图"
  $diagram = Add-ForumNotificationRectangleClassDiagram -Package $classPackage
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
  Write-Host "图名: 03_类图_论坛与通知互动_矩形版"
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

