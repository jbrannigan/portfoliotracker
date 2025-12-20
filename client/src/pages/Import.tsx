import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { importApi, watchlistsApi } from '../services/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog'
import { Progress } from '../components/ui/progress'
import {
  FileText,
  Upload,
  CheckCircle2,
  XCircle,
  Building2,
  BarChart3,
  TrendingUp,
  Loader2,
  FileSpreadsheet,
  File,
  Info
} from 'lucide-react'

interface Watchlist {
  id: number
  name: string
  source: 'seeking_alpha' | 'motley_fool'
}

interface ImportResult {
  success: boolean
  message: string
  details?: {
    positions_created?: number
    positions_updated?: number
    symbols_created?: number
    ratings_created?: number
    members_added?: number
    members_updated?: number
    errors?: string[]
  }
}

type ImportType = 'schwab' | 'seeking_alpha' | 'motley_fool' | null

function Import() {
  const queryClient = useQueryClient()

  // UI State
  const [activeImport, setActiveImport] = useState<ImportType>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [selectedWatchlist, setSelectedWatchlist] = useState<number | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)

  // Fetch watchlists
  const { data: watchlists = [] } = useQuery<Watchlist[]>({
    queryKey: ['watchlists'],
    queryFn: watchlistsApi.getAll
  })

  // Schwab import mutation
  const schwabMutation = useMutation({
    mutationFn: (file: File) => importApi.schwab(file),
    onSuccess: (data) => {
      setImportResult({
        success: true,
        message: 'Schwab positions imported successfully',
        details: data
      })
      queryClient.invalidateQueries({ queryKey: ['positions'] })
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      resetForm()
    },
    onError: (error: any) => {
      setImportResult({
        success: false,
        message: error.message || 'Failed to import Schwab file',
        details: { errors: [error.details || error.message] }
      })
    }
  })

  // Seeking Alpha import mutation
  const seekingAlphaMutation = useMutation({
    mutationFn: ({ file, watchlistId }: { file: File; watchlistId: number }) =>
      importApi.seekingAlpha(file, watchlistId),
    onSuccess: (data) => {
      setImportResult({
        success: true,
        message: 'Seeking Alpha ratings imported successfully',
        details: data
      })
      queryClient.invalidateQueries({ queryKey: ['watchlists'] })
      resetForm()
    },
    onError: (error: any) => {
      setImportResult({
        success: false,
        message: error.message || 'Failed to import Seeking Alpha file',
        details: { errors: [error.details || error.message] }
      })
    }
  })

  // Motley Fool import mutation
  const motleyFoolMutation = useMutation({
    mutationFn: ({ file, watchlistId }: { file: File; watchlistId: number }) =>
      importApi.motleyFool(file, watchlistId),
    onSuccess: (data) => {
      setImportResult({
        success: true,
        message: 'Motley Fool ratings imported successfully',
        details: data
      })
      queryClient.invalidateQueries({ queryKey: ['watchlists'] })
      resetForm()
    },
    onError: (error: any) => {
      setImportResult({
        success: false,
        message: error.message || 'Failed to import Motley Fool file',
        details: { errors: [error.details || error.message] }
      })
    }
  })

  const resetForm = () => {
    setSelectedFile(null)
    setSelectedWatchlist(null)
    setActiveImport(null)
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0])
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0])
    }
  }

  const handleSchwabImport = () => {
    if (!selectedFile) return
    schwabMutation.mutate(selectedFile)
  }

  const handleSeekingAlphaImport = () => {
    if (!selectedFile || !selectedWatchlist) return
    seekingAlphaMutation.mutate({ file: selectedFile, watchlistId: selectedWatchlist })
  }

  const handleMotleyFoolImport = () => {
    if (!selectedFile || !selectedWatchlist) return
    motleyFoolMutation.mutate({ file: selectedFile, watchlistId: selectedWatchlist })
  }

  const isProcessing = schwabMutation.isPending || seekingAlphaMutation.isPending || motleyFoolMutation.isPending

  const seekingAlphaWatchlists = watchlists.filter(w => w.source === 'seeking_alpha')
  const motleyFoolWatchlists = watchlists.filter(w => w.source === 'motley_fool')

  // Calculate current step for progress indicator
  const getCurrentStep = (): number => {
    if (!activeImport) return 0
    if (activeImport === 'schwab') {
      // Schwab: 1=source, 2=upload, 3=ready
      if (!selectedFile) return 1
      return 3
    } else {
      // SA/MF: 1=source, 2=watchlist, 3=upload, 4=ready
      if (!selectedWatchlist) return 2
      if (!selectedFile) return 3
      return 4
    }
  }

  const currentStep = getCurrentStep()
  const totalSteps = activeImport === 'schwab' ? 3 : 4

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold tracking-tight">Import Data</h1>
        <p className="text-muted-foreground mt-2">
          Import positions from Schwab or ratings from Seeking Alpha and Motley Fool
        </p>
      </div>

      {/* Import Result */}
      {importResult && (
        <Alert variant={importResult.success ? 'default' : 'destructive'} className="relative">
          <div className="flex items-start gap-3">
            {importResult.success ? (
              <CheckCircle2 className="h-5 w-5 text-success" />
            ) : (
              <XCircle className="h-5 w-5" />
            )}
            <div className="flex-1">
              <AlertTitle>{importResult.message}</AlertTitle>
              {importResult.details && (
                <AlertDescription className="mt-2 space-y-1">
                  {importResult.details.positions_created !== undefined && (
                    <p>Positions created: {importResult.details.positions_created}</p>
                  )}
                  {importResult.details.positions_updated !== undefined && (
                    <p>Positions updated: {importResult.details.positions_updated}</p>
                  )}
                  {importResult.details.symbols_created !== undefined && (
                    <p>Symbols created: {importResult.details.symbols_created}</p>
                  )}
                  {importResult.details.ratings_created !== undefined && (
                    <p>Ratings created: {importResult.details.ratings_created}</p>
                  )}
                  {importResult.details.members_added !== undefined && (
                    <p>Members added: {importResult.details.members_added}</p>
                  )}
                  {importResult.details.members_updated !== undefined && (
                    <p>Members updated: {importResult.details.members_updated}</p>
                  )}
                  {importResult.details.errors && importResult.details.errors.length > 0 && (
                    <div className="mt-2">
                      <p className="font-medium">Errors:</p>
                      <ul className="list-disc list-inside ml-2">
                        {importResult.details.errors.map((err, idx) => (
                          <li key={idx}>{err}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </AlertDescription>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setImportResult(null)}
              className="absolute top-3 right-3"
            >
              <XCircle className="h-4 w-4" />
            </Button>
          </div>
        </Alert>
      )}

      {/* Import Type Selection Cards */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Schwab Import */}
        <Card className="group hover:border-primary/50 transition-all cursor-pointer"
          onClick={() => {
            setActiveImport('schwab')
            setSelectedFile(null)
            setImportResult(null)
          }}>
          <CardHeader className="relative overflow-hidden bg-gradient-to-br from-blue-500/10 via-transparent to-transparent">
            <div className="flex items-center gap-3">
              <Building2 className="h-6 w-6 text-blue-500" />
              <CardTitle>Schwab Positions</CardTitle>
            </div>
            <CardDescription className="mt-2">
              Import positions from a Schwab CSV export. Creates or updates positions and accounts.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <FileText className="h-3 w-3" />
              <span>CSV format</span>
            </div>
            <Badge variant="outline" className="text-xs">
              Positions & Accounts
            </Badge>
          </CardContent>
        </Card>

        {/* Seeking Alpha Import */}
        <Card className={`group transition-all ${seekingAlphaWatchlists.length === 0 ? 'opacity-50' : 'hover:border-primary/50 cursor-pointer'}`}
          onClick={() => {
            if (seekingAlphaWatchlists.length > 0) {
              setActiveImport('seeking_alpha')
              setSelectedFile(null)
              setImportResult(null)
            }
          }}>
          <CardHeader className="relative overflow-hidden bg-gradient-to-br from-purple-500/10 via-transparent to-transparent">
            <div className="flex items-center gap-3">
              <BarChart3 className="h-6 w-6 text-purple-500" />
              <CardTitle>Seeking Alpha</CardTitle>
            </div>
            <CardDescription className="mt-2">
              Import ratings from a Seeking Alpha Excel export. Creates watchlist members and ratings.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <FileSpreadsheet className="h-3 w-3" />
              <span>Excel (.xlsx) format</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                Ratings & Watchlists
              </Badge>
              {seekingAlphaWatchlists.length === 0 && (
                <Badge variant="destructive" className="text-xs">
                  No watchlist
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Motley Fool Import */}
        <Card className={`group transition-all ${motleyFoolWatchlists.length === 0 ? 'opacity-50' : 'hover:border-primary/50 cursor-pointer'}`}
          onClick={() => {
            if (motleyFoolWatchlists.length > 0) {
              setActiveImport('motley_fool')
              setSelectedFile(null)
              setImportResult(null)
            }
          }}>
          <CardHeader className="relative overflow-hidden bg-gradient-to-br from-green-500/10 via-transparent to-transparent">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-6 w-6 text-green-500" />
              <CardTitle>Motley Fool</CardTitle>
            </div>
            <CardDescription className="mt-2">
              Import ratings from a Motley Fool CSV export. Creates watchlist members and ratings.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <FileText className="h-3 w-3" />
              <span>CSV format</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                Ratings & Watchlists
              </Badge>
              {motleyFoolWatchlists.length === 0 && (
                <Badge variant="destructive" className="text-xs">
                  No watchlist
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Import Dialog with Step Indicator */}
      <Dialog open={!!activeImport} onOpenChange={(open) => !open && resetForm()}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {activeImport === 'schwab' && 'Import Schwab Positions'}
              {activeImport === 'seeking_alpha' && 'Import Seeking Alpha Ratings'}
              {activeImport === 'motley_fool' && 'Import Motley Fool Ratings'}
            </DialogTitle>
            <DialogDescription>
              Follow the steps below to import your data
            </DialogDescription>
          </DialogHeader>

          {/* Step Indicator */}
          <div className="py-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Step {currentStep} of {totalSteps}</span>
              <span className="text-xs text-muted-foreground">
                {currentStep === 1 && 'Select source'}
                {currentStep === 2 && (activeImport === 'schwab' ? 'Upload file' : 'Choose watchlist')}
                {currentStep === 3 && activeImport !== 'schwab' && 'Upload file'}
                {currentStep === 3 && activeImport === 'schwab' && 'Ready to import'}
                {currentStep === 4 && 'Ready to import'}
              </span>
            </div>
            <Progress value={(currentStep / totalSteps) * 100} className="h-2" />
          </div>

          <div className="space-y-6">
            {/* Watchlist Selection (for SA and MF) */}
            {activeImport !== 'schwab' && (
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Select Watchlist <span className="text-destructive">*</span>
                </label>
                <Select
                  value={selectedWatchlist?.toString()}
                  onValueChange={(value) => setSelectedWatchlist(parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a watchlist..." />
                  </SelectTrigger>
                  <SelectContent>
                    {activeImport === 'seeking_alpha' &&
                      seekingAlphaWatchlists.map((w) => (
                        <SelectItem key={w.id} value={w.id.toString()}>
                          {w.name}
                        </SelectItem>
                      ))}
                    {activeImport === 'motley_fool' &&
                      motleyFoolWatchlists.map((w) => (
                        <SelectItem key={w.id} value={w.id.toString()}>
                          {w.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Ratings will be associated with this watchlist
                </p>
              </div>
            )}

            {/* Enhanced File Upload with Drag & Drop */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Upload File <span className="text-destructive">*</span>
              </label>
              <div
                className={`relative border-2 border-dashed rounded-lg p-8 transition-all ${
                  dragActive
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <div className="flex flex-col items-center justify-center space-y-4">
                  {!selectedFile ? (
                    <>
                      <div className="rounded-full bg-accent p-4">
                        {activeImport === 'seeking_alpha' ? (
                          <FileSpreadsheet className="h-8 w-8 text-primary" />
                        ) : (
                          <FileText className="h-8 w-8 text-primary" />
                        )}
                      </div>
                      <div className="text-center">
                        <label className="relative cursor-pointer">
                          <span className="text-sm font-medium text-primary hover:text-primary/80">
                            Choose a file
                          </span>
                          <input
                            type="file"
                            className="sr-only"
                            accept={activeImport === 'seeking_alpha' ? '.xlsx' : '.csv'}
                            onChange={handleFileChange}
                          />
                        </label>
                        <span className="text-sm text-muted-foreground"> or drag and drop</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {activeImport === 'seeking_alpha' ? 'Excel (.xlsx) files only' : 'CSV files only'}
                      </p>
                    </>
                  ) : (
                    <div className="w-full">
                      <div className="flex items-center gap-3 bg-accent rounded-lg p-4">
                        <div className="rounded-full bg-success/10 p-2">
                          <CheckCircle2 className="h-5 w-5 text-success" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{selectedFile.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {(selectedFile.size / 1024).toFixed(2)} KB
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedFile(null)}
                          className="flex-shrink-0"
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Instructions */}
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>How to export your data</AlertTitle>
              <AlertDescription>
                <ol className="mt-2 space-y-1 list-decimal list-inside text-sm">
                  {activeImport === 'schwab' && (
                    <>
                      <li>Log in to your Schwab account</li>
                      <li>Navigate to Positions</li>
                      <li>Click "Export" and download as CSV</li>
                      <li>Upload the CSV file above</li>
                    </>
                  )}
                  {activeImport === 'seeking_alpha' && (
                    <>
                      <li>Log in to Seeking Alpha</li>
                      <li>Navigate to your portfolio/watchlist</li>
                      <li>Export as Excel (.xlsx)</li>
                      <li>Select or create a watchlist above</li>
                      <li>Upload the Excel file</li>
                    </>
                  )}
                  {activeImport === 'motley_fool' && (
                    <>
                      <li>Log in to Motley Fool</li>
                      <li>Navigate to your recommendations</li>
                      <li>Export as CSV</li>
                      <li>Select or create a watchlist above</li>
                      <li>Upload the CSV file</li>
                    </>
                  )}
                </ol>
              </AlertDescription>
            </Alert>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={resetForm}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (activeImport === 'schwab') handleSchwabImport()
                else if (activeImport === 'seeking_alpha') handleSeekingAlphaImport()
                else if (activeImport === 'motley_fool') handleMotleyFoolImport()
              }}
              disabled={
                !selectedFile ||
                isProcessing ||
                (activeImport !== 'schwab' && !selectedWatchlist)
              }
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Import
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Help Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            Import Help
          </CardTitle>
          <CardDescription>
            Everything you need to know about importing data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" />
              Creating Watchlists
            </h4>
            <p className="text-sm text-muted-foreground">
              Before importing Seeking Alpha or Motley Fool data, you need to create a watchlist for each service.
              You can create watchlists via the API or by modifying the database directly.
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <File className="h-4 w-4 text-primary" />
              File Requirements
            </h4>
            <ul className="text-sm text-muted-foreground space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-blue-500 mt-1">•</span>
                <span><strong>Schwab:</strong> CSV file exported from Schwab Positions page</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-500 mt-1">•</span>
                <span><strong>Seeking Alpha:</strong> Excel (.xlsx) file with ratings data</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-1">•</span>
                <span><strong>Motley Fool:</strong> CSV file with recommendations</span>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <Upload className="h-4 w-4 text-primary" />
              What Happens During Import
            </h4>
            <ul className="text-sm text-muted-foreground space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-blue-500 mt-1">•</span>
                <span><strong>Schwab:</strong> Creates/updates positions and accounts based on CSV data</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-500 mt-1">•</span>
                <span><strong>Seeking Alpha:</strong> Creates ratings and adds symbols to watchlist</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-1">•</span>
                <span><strong>Motley Fool:</strong> Creates ratings and adds symbols to watchlist</span>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <Info className="h-4 w-4 text-primary" />
              Troubleshooting
            </h4>
            <p className="text-sm text-muted-foreground">
              If an import fails, check the error message for details. Common issues include incorrect file format,
              missing required columns, or invalid data values. Make sure you're uploading the correct file type
              for each service.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default Import
