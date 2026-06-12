$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$modelBaseName = "haikou-guide-simple-sequence-diagrams"
$qeaPath = Join-Path $scriptDir "$modelBaseName.qea"
$eapxPath = Join-Path $scriptDir "$modelBaseName.eapx"
$loginPngPath = Join-Path $scriptDir "09_sequence_login.png"
$recommendPngPath = Join-Path $scriptDir "10_sequence_recommend_place.png"
$commentPngPath = Join-Path $scriptDir "11_sequence_comment_reply.png"
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

function Add-Diagram {
  param($Package, [string]$Name, [string]$Notes)
  $diagram = $Package.Diagrams.AddNew($Name, "Sequence")
  $diagram.Notes = $Notes
  $diagram.cx = 1160
  $diagram.cy = 740
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
  try { $connector.SequenceNo = [string]$Seq } catch {}
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

function Add-Lifelines {
  param($Package, $Diagram, [hashtable]$Registry, [string[]]$Keys)
  for ($i = 0; $i -lt $Keys.Count; $i += 1) {
    Add-DiagramObject -Diagram $Diagram -Element $Registry[$Keys[$i]] -Left (25 + $i * 150) -Top 630 -Width 125 -Height 70 | Out-Null
  }
}

function Add-LoginSequenceDiagram {
  param($Package)

  $r = @{}
  $diagram = Add-Diagram -Package $Package -Name "09 Sequence - Login" -Notes "Use case: registered user logs in."

  Add-Element -Package $Package -Registry $r -Key "user" -Name "RegisteredUser" -Type "Actor" | Out-Null
  Add-Element -Package $Package -Registry $r -Key "panel" -Name "AuthPanel" -Type "Object" -Stereotype "boundary" | Out-Null
  Add-Element -Package $Package -Registry $r -Key "apiClient" -Name "APIClient" -Type "Object" -Stereotype "control" | Out-Null
  Add-Element -Package $Package -Registry $r -Key "authApi" -Name "AuthRoutes" -Type "Object" -Stereotype "control" | Out-Null
  Add-Element -Package $Package -Registry $r -Key "usersDb" -Name "users_table" -Type "Object" -Stereotype "database" | Out-Null
  Add-Element -Package $Package -Registry $r -Key "bcrypt" -Name "bcrypt" -Type "Object" -Stereotype "service" | Out-Null
  Add-Element -Package $Package -Registry $r -Key "token" -Name "AuthToken" -Type "Object" -Stereotype "service" | Out-Null
  Add-Element -Package $Package -Registry $r -Key "storage" -Name "LocalStorage" -Type "Object" -Stereotype "storage" | Out-Null
  Add-Lifelines -Package $Package -Diagram $diagram -Registry $r -Keys @("user", "panel", "apiClient", "authApi", "usersDb", "bcrypt", "token", "storage")

  Add-Message -Diagram $diagram -Source $r["user"] -Target $r["panel"] -Seq 1 -Name "enter phone and password" | Out-Null
  Add-Message -Diagram $diagram -Source $r["panel"] -Target $r["apiClient"] -Seq 2 -Name "submit login form" | Out-Null
  Add-Message -Diagram $diagram -Source $r["apiClient"] -Target $r["authApi"] -Seq 3 -Name "POST /api/auth/login" | Out-Null
  Add-Message -Diagram $diagram -Source $r["authApi"] -Target $r["usersDb"] -Seq 4 -Name "find user by phone" | Out-Null
  Add-Message -Diagram $diagram -Source $r["usersDb"] -Target $r["authApi"] -Seq 5 -Name "return user row" | Out-Null
  Add-Message -Diagram $diagram -Source $r["authApi"] -Target $r["bcrypt"] -Seq 6 -Name "compare password hash" | Out-Null
  Add-Message -Diagram $diagram -Source $r["bcrypt"] -Target $r["authApi"] -Seq 7 -Name "password valid" | Out-Null
  Add-Message -Diagram $diagram -Source $r["authApi"] -Target $r["token"] -Seq 8 -Name "create auth token" | Out-Null
  Add-Message -Diagram $diagram -Source $r["authApi"] -Target $r["apiClient"] -Seq 9 -Name "return token and user" | Out-Null
  Add-Message -Diagram $diagram -Source $r["panel"] -Target $r["storage"] -Seq 10 -Name "save login state" | Out-Null
  Add-Message -Diagram $diagram -Source $r["panel"] -Target $r["user"] -Seq 11 -Name "enter home page" | Out-Null

  [void]$diagram.Update()
  return $diagram
}

function Add-RecommendSequenceDiagram {
  param($Package)

  $r = @{}
  $diagram = Add-Diagram -Package $Package -Name "10 Sequence - Recommend Place" -Notes "Use case: registered user recommends a new place."

  Add-Element -Package $Package -Registry $r -Key "user" -Name "RegisteredUser" -Type "Actor" | Out-Null
  Add-Element -Package $Package -Registry $r -Key "home" -Name "HomePanels" -Type "Object" -Stereotype "boundary" | Out-Null
  Add-Element -Package $Package -Registry $r -Key "modal" -Name "RecommendModal" -Type "Object" -Stereotype "boundary" | Out-Null
  Add-Element -Package $Package -Registry $r -Key "handler" -Name "InteractionHandlers" -Type "Object" -Stereotype "control" | Out-Null
  Add-Element -Package $Package -Registry $r -Key "recApi" -Name "RecommendationRoutes" -Type "Object" -Stereotype "control" | Out-Null
  Add-Element -Package $Package -Registry $r -Key "upload" -Name "UploadService" -Type "Object" -Stereotype "service" | Out-Null
  Add-Element -Package $Package -Registry $r -Key "recDb" -Name "recommendations_table" -Type "Object" -Stereotype "database" | Out-Null
  Add-Lifelines -Package $Package -Diagram $diagram -Registry $r -Keys @("user", "home", "modal", "handler", "recApi", "upload", "recDb")

  Add-Message -Diagram $diagram -Source $r["user"] -Target $r["home"] -Seq 1 -Name "click Recommend" | Out-Null
  Add-Message -Diagram $diagram -Source $r["home"] -Target $r["modal"] -Seq 2 -Name "open recommend modal" | Out-Null
  Add-Message -Diagram $diagram -Source $r["user"] -Target $r["modal"] -Seq 3 -Name "fill name, description, location, images" | Out-Null
  Add-Message -Diagram $diagram -Source $r["modal"] -Target $r["handler"] -Seq 4 -Name "submit recommendation" | Out-Null
  Add-Message -Diagram $diagram -Source $r["handler"] -Target $r["recApi"] -Seq 5 -Name "POST /api/recommendations/add" | Out-Null
  Add-Message -Diagram $diagram -Source $r["recApi"] -Target $r["upload"] -Seq 6 -Name "validate uploaded images" | Out-Null
  Add-Message -Diagram $diagram -Source $r["upload"] -Target $r["recApi"] -Seq 7 -Name "return image urls" | Out-Null
  Add-Message -Diagram $diagram -Source $r["recApi"] -Target $r["recDb"] -Seq 8 -Name "insert recommendation" | Out-Null
  Add-Message -Diagram $diagram -Source $r["recDb"] -Target $r["recApi"] -Seq 9 -Name "insert ok" | Out-Null
  Add-Message -Diagram $diagram -Source $r["recApi"] -Target $r["handler"] -Seq 10 -Name "return success" | Out-Null
  Add-Message -Diagram $diagram -Source $r["handler"] -Target $r["home"] -Seq 11 -Name "refresh recommendation list" | Out-Null
  Add-Message -Diagram $diagram -Source $r["home"] -Target $r["user"] -Seq 12 -Name "show new place" | Out-Null

  [void]$diagram.Update()
  return $diagram
}

function Add-CommentSequenceDiagram {
  param($Package)

  $r = @{}
  $diagram = Add-Diagram -Package $Package -Name "11 Sequence - Comment Reply" -Notes "Use case: registered user posts a place comment or reply."

  Add-Element -Package $Package -Registry $r -Key "user" -Name "RegisteredUser" -Type "Actor" | Out-Null
  Add-Element -Package $Package -Registry $r -Key "overlay" -Name "CommentsOverlay" -Type "Object" -Stereotype "boundary" | Out-Null
  Add-Element -Package $Package -Registry $r -Key "handler" -Name "InteractionHandlers" -Type "Object" -Stereotype "control" | Out-Null
  Add-Element -Package $Package -Registry $r -Key "commentApi" -Name "PlaceCommentRoutes" -Type "Object" -Stereotype "control" | Out-Null
  Add-Element -Package $Package -Registry $r -Key "upload" -Name "UploadService" -Type "Object" -Stereotype "service" | Out-Null
  Add-Element -Package $Package -Registry $r -Key "commentDb" -Name "comments_table" -Type "Object" -Stereotype "database" | Out-Null
  Add-Element -Package $Package -Registry $r -Key "noticeDb" -Name "notifications_table" -Type "Object" -Stereotype "database" | Out-Null
  Add-Lifelines -Package $Package -Diagram $diagram -Registry $r -Keys @("user", "overlay", "handler", "commentApi", "upload", "commentDb", "noticeDb")

  Add-Message -Diagram $diagram -Source $r["user"] -Target $r["overlay"] -Seq 1 -Name "open comment panel" | Out-Null
  Add-Message -Diagram $diagram -Source $r["overlay"] -Target $r["handler"] -Seq 2 -Name "load comments" | Out-Null
  Add-Message -Diagram $diagram -Source $r["handler"] -Target $r["commentApi"] -Seq 3 -Name "GET /api/comments/:placeId" | Out-Null
  Add-Message -Diagram $diagram -Source $r["commentApi"] -Target $r["commentDb"] -Seq 4 -Name "query comments" | Out-Null
  Add-Message -Diagram $diagram -Source $r["commentDb"] -Target $r["overlay"] -Seq 5 -Name "return comment list" | Out-Null
  Add-Message -Diagram $diagram -Source $r["user"] -Target $r["overlay"] -Seq 6 -Name "enter content, images, reply target" | Out-Null
  Add-Message -Diagram $diagram -Source $r["overlay"] -Target $r["handler"] -Seq 7 -Name "add comment" | Out-Null
  Add-Message -Diagram $diagram -Source $r["handler"] -Target $r["commentApi"] -Seq 8 -Name "POST /api/comments/add" | Out-Null
  Add-Message -Diagram $diagram -Source $r["commentApi"] -Target $r["upload"] -Seq 9 -Name "validate images" | Out-Null
  Add-Message -Diagram $diagram -Source $r["upload"] -Target $r["commentApi"] -Seq 10 -Name "return image urls" | Out-Null
  Add-Message -Diagram $diagram -Source $r["commentApi"] -Target $r["commentDb"] -Seq 11 -Name "insert comment" | Out-Null
  Add-Message -Diagram $diagram -Source $r["commentApi"] -Target $r["noticeDb"] -Seq 12 -Name "if reply, insert notification" | Out-Null
  Add-Message -Diagram $diagram -Source $r["commentApi"] -Target $r["handler"] -Seq 13 -Name "return success" | Out-Null
  Add-Message -Diagram $diagram -Source $r["handler"] -Target $r["overlay"] -Seq 14 -Name "clear input and refresh" | Out-Null

  [void]$diagram.Update()
  return $diagram
}

function Build-SimpleSequenceModel {
  param($Repository)

  $root = Get-RootModel -Repository $Repository
  $modelPackage = Add-Package -ParentPackage $root -Name "Haikou Guide Simple Sequence Diagrams"
  $modelPackage.Notes = "Generated by create-simple-sequence-diagrams-ea.ps1 through Enterprise Architect COM."
  [void]$modelPackage.Update()

  $sequencePackage = Add-Package -ParentPackage $modelPackage -Name "Simple Sequence Diagrams"
  $loginDiagram = Add-LoginSequenceDiagram -Package $sequencePackage
  $recommendDiagram = Add-RecommendSequenceDiagram -Package $sequencePackage
  $commentDiagram = Add-CommentSequenceDiagram -Package $sequencePackage

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
  $result = Build-SimpleSequenceModel -Repository $repository

  $project = $repository.GetProjectInterface()
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
  Write-Host "Diagram names: 09 Sequence - Login; 10 Sequence - Recommend Place; 11 Sequence - Comment Reply"
} finally {
  if ($repository -ne $null) {
    try { [void]$repository.CloseFile() } catch {}
    try { [void]$repository.Exit() } catch {}
  }
}
