$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$modelBaseName = "haikou-guide-feature-class-diagrams"
$qeaPath = Join-Path $scriptDir "$modelBaseName.qea"
$eapxPath = Join-Path $scriptDir "$modelBaseName.eapx"
$commentPngPath = Join-Path $scriptDir "02_类图_地点评论与图片互动.png"
$forumPngPath = Join-Path $scriptDir "03_类图_论坛与通知互动.png"
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

function Add-Class {
  param(
    $Package,
    [hashtable]$Registry,
    [string]$Key,
    [string]$Name,
    [string]$Stereotype,
    [string[]]$Attributes,
    [string[]]$Operations
  )

  $element = $Package.Elements.AddNew($Name, "Class")
  if ($Stereotype) {
    $element.Stereotype = $Stereotype
  }
  [void]$element.Update()

  foreach ($attributeSpec in $Attributes) {
    $parts = $attributeSpec.Split(":", 2)
    $attribute = $element.Attributes.AddNew($parts[0], $(if ($parts.Length -gt 1) { $parts[1] } else { "" }))
    $attribute.Visibility = "Public"
    [void]$attribute.Update()
  }

  foreach ($operationSpec in $Operations) {
    $method = $element.Methods.AddNew($operationSpec, "")
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

function Add-Diagram {
  param($Package, [string]$Name, [string]$Notes)
  $diagram = $Package.Diagrams.AddNew($Name, "Logical")
  $diagram.Notes = $Notes
  $diagram.cx = 980
  $diagram.cy = 640
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
  if ($Stereotype) {
    $connector.Stereotype = $Stereotype
  }
  if ($SourceRole) {
    $connector.ClientEnd.Role = $SourceRole
  }
  if ($TargetRole) {
    $connector.SupplierEnd.Role = $TargetRole
  }
  if ($SourceCard) {
    $connector.ClientEnd.Cardinality = $SourceCard
  }
  if ($TargetCard) {
    $connector.SupplierEnd.Cardinality = $TargetCard
  }
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

function Add-CommentImageDiagram {
  param($Package)

  $r = @{}
  $diagram = Add-Diagram -Package $Package -Name "02_类图_地点评论与图片互动" -Notes "展示地点评论、评论点赞、图片上传和通知之间的核心类关系。"

  Add-Class -Package $Package -Registry $r -Key "User" -Name "User" -Stereotype "entity" -Attributes @(
    "id:int", "username:String", "phone:String", "avatarUrl:String"
  ) -Operations @(
    "login()", "uploadAvatar()", "viewNotifications()"
  ) | Out-Null

  Add-Class -Package $Package -Registry $r -Key "Place" -Name "Place" -Stereotype "entity" -Attributes @(
    "id:String", "name:String", "type:String", "lat:Decimal", "lng:Decimal"
  ) -Operations @(
    "showDetail()", "showMapMarker()"
  ) | Out-Null

  Add-Class -Package $Package -Registry $r -Key "Comment" -Name "Comment" -Stereotype "entity" -Attributes @(
    "id:int", "placeId:String", "userPhone:String", "content:Text", "imageUrl:JSON", "parentId:int", "createdAt:DateTime"
  ) -Operations @(
    "reply()", "deleteTree()"
  ) | Out-Null

  Add-Class -Package $Package -Registry $r -Key "CommentLike" -Name "CommentLike" -Stereotype "entity" -Attributes @(
    "id:int", "phone:String", "commentId:int", "createdAt:DateTime"
  ) -Operations @(
    "toggle()"
  ) | Out-Null

  Add-Class -Package $Package -Registry $r -Key "UploadImage" -Name "UploadImage" -Stereotype "value object" -Attributes @(
    "url:String", "thumbnail:String", "mimeType:String", "size:int"
  ) -Operations @(
    "validateSignature()", "toPublicUrl()"
  ) | Out-Null

  Add-Class -Package $Package -Registry $r -Key "Notification" -Name "Notification" -Stereotype "entity" -Attributes @(
    "id:int", "receiverPhone:String", "senderPhone:String", "type:String", "placeId:String", "isRead:Boolean"
  ) -Operations @(
    "markRead()", "clear()"
  ) | Out-Null

  Add-Class -Package $Package -Registry $r -Key "CommentService" -Name "CommentService" -Stereotype "control" -Attributes @(
    "pool:MySQLPool", "addNotice:Function"
  ) -Operations @(
    "listComments()", "addComment()", "toggleLike()", "deleteCommentTree()"
  ) | Out-Null

  Add-Class -Package $Package -Registry $r -Key "UploadService" -Name "UploadService" -Stereotype "control" -Attributes @(
    "uploadDir:String", "maxSize:5MB"
  ) -Operations @(
    "createUploadMiddleware()", "validateUploadedImages()", "buildImagePayload()"
  ) | Out-Null

  Add-DiagramObject -Diagram $diagram -Element $r["User"] -Left 40 -Top 500 -Width 185 -Height 135 | Out-Null
  Add-DiagramObject -Diagram $diagram -Element $r["Place"] -Left 40 -Top 260 -Width 185 -Height 130 | Out-Null
  Add-DiagramObject -Diagram $diagram -Element $r["Comment"] -Left 315 -Top 500 -Width 230 -Height 175 | Out-Null
  Add-DiagramObject -Diagram $diagram -Element $r["CommentLike"] -Left 635 -Top 500 -Width 205 -Height 120 | Out-Null
  Add-DiagramObject -Diagram $diagram -Element $r["UploadImage"] -Left 315 -Top 245 -Width 230 -Height 130 | Out-Null
  Add-DiagramObject -Diagram $diagram -Element $r["Notification"] -Left 635 -Top 250 -Width 230 -Height 145 | Out-Null
  Add-DiagramObject -Diagram $diagram -Element $r["CommentService"] -Left 180 -Top 20 -Width 255 -Height 130 | Out-Null
  Add-DiagramObject -Diagram $diagram -Element $r["UploadService"] -Left 545 -Top 20 -Width 255 -Height 130 | Out-Null

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

function Add-ForumNotificationDiagram {
  param($Package)

  $r = @{}
  $diagram = Add-Diagram -Package $Package -Name "03_类图_论坛与通知互动" -Notes "展示论坛帖子、评论、打 call、评论点赞和论坛通知之间的核心类关系。"

  Add-Class -Package $Package -Registry $r -Key "User" -Name "User" -Stereotype "entity" -Attributes @(
    "id:int", "username:String", "phone:String", "avatarUrl:String"
  ) -Operations @(
    "publishPost()", "replyPost()", "callPost()"
  ) | Out-Null

  Add-Class -Package $Package -Registry $r -Key "ForumPost" -Name "ForumPost" -Stereotype "entity" -Attributes @(
    "id:int", "userPhone:String", "content:Text", "imageUrl:JSON", "createdAt:DateTime"
  ) -Operations @(
    "publish()", "delete()", "isActive()"
  ) | Out-Null

  Add-Class -Package $Package -Registry $r -Key "ForumComment" -Name "ForumComment" -Stereotype "entity" -Attributes @(
    "id:int", "postId:int", "parentId:int", "userPhone:String", "content:Text", "imageUrl:JSON", "createdAt:DateTime"
  ) -Operations @(
    "reply()", "deleteTree()"
  ) | Out-Null

  Add-Class -Package $Package -Registry $r -Key "ForumPostCall" -Name "ForumPostCall" -Stereotype "entity" -Attributes @(
    "id:int", "postId:int", "userPhone:String", "createdAt:DateTime"
  ) -Operations @(
    "toggle()"
  ) | Out-Null

  Add-Class -Package $Package -Registry $r -Key "ForumCommentLike" -Name "ForumCommentLike" -Stereotype "entity" -Attributes @(
    "id:int", "commentId:int", "userPhone:String", "createdAt:DateTime"
  ) -Operations @(
    "toggle()"
  ) | Out-Null

  Add-Class -Package $Package -Registry $r -Key "Notification" -Name "Notification" -Stereotype "entity" -Attributes @(
    "id:int", "receiverPhone:String", "senderPhone:String", "type:String", "placeId:String", "content:Text", "isRead:Boolean"
  ) -Operations @(
    "markForumRead()", "clearForum()"
  ) | Out-Null

  Add-Class -Package $Package -Registry $r -Key "ForumService" -Name "ForumService" -Stereotype "control" -Attributes @(
    "pool:MySQLPool", "noticeSender:Function"
  ) -Operations @(
    "listPosts()", "addPost()", "addComment()", "callPost()", "likeComment()", "deleteContent()"
  ) | Out-Null

  Add-Class -Package $Package -Registry $r -Key "NotificationService" -Name "NotificationService" -Stereotype "control" -Attributes @(
    "forumTypes:String[]"
  ) -Operations @(
    "listNotifications()", "markForumRead()", "clearForum()"
  ) | Out-Null

  Add-DiagramObject -Diagram $diagram -Element $r["User"] -Left 40 -Top 500 -Width 185 -Height 130 | Out-Null
  Add-DiagramObject -Diagram $diagram -Element $r["ForumPost"] -Left 315 -Top 520 -Width 230 -Height 150 | Out-Null
  Add-DiagramObject -Diagram $diagram -Element $r["ForumComment"] -Left 315 -Top 280 -Width 230 -Height 175 | Out-Null
  Add-DiagramObject -Diagram $diagram -Element $r["ForumPostCall"] -Left 635 -Top 520 -Width 215 -Height 120 | Out-Null
  Add-DiagramObject -Diagram $diagram -Element $r["ForumCommentLike"] -Left 635 -Top 310 -Width 220 -Height 120 | Out-Null
  Add-DiagramObject -Diagram $diagram -Element $r["Notification"] -Left 635 -Top 85 -Width 235 -Height 155 | Out-Null
  Add-DiagramObject -Diagram $diagram -Element $r["ForumService"] -Left 65 -Top 80 -Width 250 -Height 150 | Out-Null
  Add-DiagramObject -Diagram $diagram -Element $r["NotificationService"] -Left 365 -Top 80 -Width 235 -Height 125 | Out-Null

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

function Build-FeatureClassModel {
  param($Repository)

  $root = Get-RootModel -Repository $Repository
  $modelPackage = Add-Package -ParentPackage $root -Name "海口旅行网站特色类图模型"
  $modelPackage.Notes = "由 create-feature-class-diagrams-ea.ps1 调用本机 Enterprise Architect COM 自动生成。"
  [void]$modelPackage.Update()

  $classPackage = Add-Package -ParentPackage $modelPackage -Name "1_特色模块类图"
  $commentDiagram = Add-CommentImageDiagram -Package $classPackage
  $forumDiagram = Add-ForumNotificationDiagram -Package $classPackage

  $Repository.SaveDiagram($commentDiagram.DiagramID)
  $Repository.SaveDiagram($forumDiagram.DiagramID)
  $Repository.ReloadDiagram($commentDiagram.DiagramID)
  $Repository.ReloadDiagram($forumDiagram.DiagramID)
  $Repository.RefreshModelView($modelPackage.PackageID)

  return @{
    CommentDiagram = $commentDiagram
    ForumDiagram = $forumDiagram
    ModelPackage = $modelPackage
  }
}

$repository = $null
try {
  $repository = New-Object -ComObject EA.Repository
  $modelPath = New-EaModelFile -Repository $repository -PrimaryPath $qeaPath -FallbackPath $eapxPath
  [void]$repository.OpenFile($modelPath)
  $result = Build-FeatureClassModel -Repository $repository

  $project = $repository.GetProjectInterface()
  $commentDiagramGuidXml = $project.GUIDtoXML($result.CommentDiagram.DiagramGUID)
  $forumDiagramGuidXml = $project.GUIDtoXML($result.ForumDiagram.DiagramGUID)
  [void]$project.PutDiagramImageToFile($commentDiagramGuidXml, $commentPngPath, 1)
  [void]$project.PutDiagramImageToFile($forumDiagramGuidXml, $forumPngPath, 1)
  [void]$repository.CloseFile()
  [void]$repository.Exit()
  $repository = $null

  if (Test-Path -LiteralPath $eaExePath) {
    Start-Process -FilePath $eaExePath -ArgumentList "`"$modelPath`"" -WindowStyle Normal | Out-Null
  } else {
    Start-Process -FilePath $modelPath -WindowStyle Normal | Out-Null
  }

  Write-Host "EA 项目文件: $modelPath"
  Write-Host "导出截图文件: $commentPngPath"
  Write-Host "导出截图文件: $forumPngPath"
  Write-Host "图名: 02_类图_地点评论与图片互动"
  Write-Host "图名: 03_类图_论坛与通知互动"
} finally {
  if ($repository -ne $null) {
    try { [void]$repository.CloseFile() } catch {}
    try { [void]$repository.Exit() } catch {}
  }
}

