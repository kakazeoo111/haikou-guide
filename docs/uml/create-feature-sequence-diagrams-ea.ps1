$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$modelBaseName = "haikou-guide-feature-sequence-diagrams"
$qeaPath = Join-Path $scriptDir "$modelBaseName.qea"
$eapxPath = Join-Path $scriptDir "$modelBaseName.eapx"
$commentPngPath = Join-Path $scriptDir "04_顺序图_发布地点评论并通知.png"
$forumPngPath = Join-Path $scriptDir "05_顺序图_论坛互动并通知.png"
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

function Add-Diagram {
  param($Package, [string]$Name, [string]$Notes)
  $diagram = $Package.Diagrams.AddNew($Name, "Sequence")
  $diagram.Notes = $Notes
  $diagram.cx = 1180
  $diagram.cy = 760
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

function Add-Message {
  param($Diagram, $Source, $Target, [int]$Seq, [string]$Name)
  $connector = $Source.Connectors.AddNew("${Seq}: $Name", "Sequence")
  $connector.SupplierID = $Target.ElementID
  try {
    $connector.SequenceNo = [string]$Seq
  } catch {
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

function Add-CommentSequenceDiagram {
  param($Package)

  $r = @{}
  $diagram = Add-Diagram -Package $Package -Name "04_顺序图_发布地点评论并通知" -Notes "注册用户在地点详情中发布评论或回复，系统校验图片、写入评论并生成通知。"

  Add-Element -Package $Package -Registry $r -Key "actor" -Name "注册用户" -Type "Actor" | Out-Null
  Add-Element -Package $Package -Registry $r -Key "overlay" -Name "CommentsOverlay" -Type "Object" -Stereotype "boundary" | Out-Null
  Add-Element -Package $Package -Registry $r -Key "handler" -Name "InteractionHandlers" -Type "Object" -Stereotype "control" | Out-Null
  Add-Element -Package $Package -Registry $r -Key "commentApi" -Name "CommentService" -Type "Object" -Stereotype "control" | Out-Null
  Add-Element -Package $Package -Registry $r -Key "upload" -Name "UploadService" -Type "Object" -Stereotype "control" | Out-Null
  Add-Element -Package $Package -Registry $r -Key "commentsDb" -Name "comments表" -Type "Object" -Stereotype "database" | Out-Null
  Add-Element -Package $Package -Registry $r -Key "notice" -Name "NotificationService" -Type "Object" -Stereotype "control" | Out-Null
  Add-Element -Package $Package -Registry $r -Key "noticeDb" -Name "notifications表" -Type "Object" -Stereotype "database" | Out-Null

  $keys = @("actor", "overlay", "handler", "commentApi", "upload", "commentsDb", "notice", "noticeDb")
  for ($i = 0; $i -lt $keys.Count; $i += 1) {
    Add-DiagramObject -Diagram $diagram -Element $r[$keys[$i]] -Left (25 + $i * 145) -Top 620 -Width 120 -Height 70 | Out-Null
  }

  Add-Message -Diagram $diagram -Source $r["actor"] -Target $r["overlay"] -Seq 1 -Name "打开地点评论面板" | Out-Null
  Add-Message -Diagram $diagram -Source $r["overlay"] -Target $r["handler"] -Seq 2 -Name "fetchComments(placeId)" | Out-Null
  Add-Message -Diagram $diagram -Source $r["handler"] -Target $r["commentApi"] -Seq 3 -Name "GET /api/comments/:placeId" | Out-Null
  Add-Message -Diagram $diagram -Source $r["commentApi"] -Target $r["commentsDb"] -Seq 4 -Name "查询评论、回复和点赞统计" | Out-Null
  Add-Message -Diagram $diagram -Source $r["commentsDb"] -Target $r["overlay"] -Seq 5 -Name "返回评论列表" | Out-Null
  Add-Message -Diagram $diagram -Source $r["actor"] -Target $r["overlay"] -Seq 6 -Name "输入评论/选择图片/选择回复对象" | Out-Null
  Add-Message -Diagram $diagram -Source $r["overlay"] -Target $r["handler"] -Seq 7 -Name "handleAddComment()" | Out-Null
  Add-Message -Diagram $diagram -Source $r["handler"] -Target $r["commentApi"] -Seq 8 -Name "POST /api/comments/add" | Out-Null
  Add-Message -Diagram $diagram -Source $r["commentApi"] -Target $r["upload"] -Seq 9 -Name "validateUploadedImages()" | Out-Null
  Add-Message -Diagram $diagram -Source $r["upload"] -Target $r["commentApi"] -Seq 10 -Name "图片合法/生成图片地址" | Out-Null
  Add-Message -Diagram $diagram -Source $r["commentApi"] -Target $r["commentsDb"] -Seq 11 -Name "INSERT INTO comments" | Out-Null
  Add-Message -Diagram $diagram -Source $r["commentApi"] -Target $r["notice"] -Seq 12 -Name "回复时 addNotice()" | Out-Null
  Add-Message -Diagram $diagram -Source $r["notice"] -Target $r["noticeDb"] -Seq 13 -Name "INSERT INTO notifications" | Out-Null
  Add-Message -Diagram $diagram -Source $r["commentApi"] -Target $r["handler"] -Seq 14 -Name "返回 ok" | Out-Null
  Add-Message -Diagram $diagram -Source $r["handler"] -Target $r["overlay"] -Seq 15 -Name "清空输入并刷新评论" | Out-Null

  [void]$diagram.Update()
  return $diagram
}

function Add-ForumSequenceDiagram {
  param($Package)

  $r = @{}
  $diagram = Add-Diagram -Package $Package -Name "05_顺序图_论坛互动并通知" -Notes "注册用户在论坛发帖、评论、回复或打 call，系统写入论坛数据并生成论坛通知。"

  Add-Element -Package $Package -Registry $r -Key "actor" -Name "注册用户" -Type "Actor" | Out-Null
  Add-Element -Package $Package -Registry $r -Key "modal" -Name "ForumModal" -Type "Object" -Stereotype "boundary" | Out-Null
  Add-Element -Package $Package -Registry $r -Key "feed" -Name "ForumPostFeed" -Type "Object" -Stereotype "boundary" | Out-Null
  Add-Element -Package $Package -Registry $r -Key "forumApi" -Name "ForumService" -Type "Object" -Stereotype "control" | Out-Null
  Add-Element -Package $Package -Registry $r -Key "upload" -Name "UploadService" -Type "Object" -Stereotype "control" | Out-Null
  Add-Element -Package $Package -Registry $r -Key "postDb" -Name "forum_posts表" -Type "Object" -Stereotype "database" | Out-Null
  Add-Element -Package $Package -Registry $r -Key "commentDb" -Name "forum_comments表" -Type "Object" -Stereotype "database" | Out-Null
  Add-Element -Package $Package -Registry $r -Key "noticeDb" -Name "notifications表" -Type "Object" -Stereotype "database" | Out-Null

  $keys = @("actor", "modal", "feed", "forumApi", "upload", "postDb", "commentDb", "noticeDb")
  for ($i = 0; $i -lt $keys.Count; $i += 1) {
    Add-DiagramObject -Diagram $diagram -Element $r[$keys[$i]] -Left (25 + $i * 145) -Top 620 -Width 120 -Height 70 | Out-Null
  }

  Add-Message -Diagram $diagram -Source $r["actor"] -Target $r["modal"] -Seq 1 -Name "打开论坛页面" | Out-Null
  Add-Message -Diagram $diagram -Source $r["modal"] -Target $r["forumApi"] -Seq 2 -Name "GET /api/forum/posts" | Out-Null
  Add-Message -Diagram $diagram -Source $r["forumApi"] -Target $r["postDb"] -Seq 3 -Name "查询近 7 天帖子和打 call 统计" | Out-Null
  Add-Message -Diagram $diagram -Source $r["forumApi"] -Target $r["commentDb"] -Seq 4 -Name "查询评论数量" | Out-Null
  Add-Message -Diagram $diagram -Source $r["forumApi"] -Target $r["feed"] -Seq 5 -Name "返回帖子流" | Out-Null
  Add-Message -Diagram $diagram -Source $r["actor"] -Target $r["modal"] -Seq 6 -Name "输入帖子/评论/回复/选择图片" | Out-Null
  Add-Message -Diagram $diagram -Source $r["modal"] -Target $r["forumApi"] -Seq 7 -Name "POST /api/forum/post 或 comment" | Out-Null
  Add-Message -Diagram $diagram -Source $r["forumApi"] -Target $r["upload"] -Seq 8 -Name "runUploadImages()" | Out-Null
  Add-Message -Diagram $diagram -Source $r["upload"] -Target $r["forumApi"] -Seq 9 -Name "图片校验并返回 imageUrl" | Out-Null
  Add-Message -Diagram $diagram -Source $r["forumApi"] -Target $r["postDb"] -Seq 10 -Name "写入 forum_posts / 更新 call" | Out-Null
  Add-Message -Diagram $diagram -Source $r["forumApi"] -Target $r["commentDb"] -Seq 11 -Name "写入 forum_comments / likes" | Out-Null
  Add-Message -Diagram $diagram -Source $r["forumApi"] -Target $r["noticeDb"] -Seq 12 -Name "写入 forum_comment/forum_reply/forum_call 通知" | Out-Null
  Add-Message -Diagram $diagram -Source $r["forumApi"] -Target $r["modal"] -Seq 13 -Name "返回 ok" | Out-Null
  Add-Message -Diagram $diagram -Source $r["modal"] -Target $r["feed"] -Seq 14 -Name "刷新帖子、评论和未读数" | Out-Null

  [void]$diagram.Update()
  return $diagram
}

function Build-FeatureSequenceModel {
  param($Repository)

  $root = Get-RootModel -Repository $Repository
  $modelPackage = Add-Package -ParentPackage $root -Name "海口旅行网站特色顺序图模型"
  $modelPackage.Notes = "由 create-feature-sequence-diagrams-ea.ps1 调用本机 Enterprise Architect COM 自动生成。"
  [void]$modelPackage.Update()

  $sequencePackage = Add-Package -ParentPackage $modelPackage -Name "1_特色模块顺序图"
  $commentDiagram = Add-CommentSequenceDiagram -Package $sequencePackage
  $forumDiagram = Add-ForumSequenceDiagram -Package $sequencePackage

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
  $result = Build-FeatureSequenceModel -Repository $repository

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
  Write-Host "图名: 04_顺序图_发布地点评论并通知"
  Write-Host "图名: 05_顺序图_论坛互动并通知"
} finally {
  if ($repository -ne $null) {
    try { [void]$repository.CloseFile() } catch {}
    try { [void]$repository.Exit() } catch {}
  }
}


