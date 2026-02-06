{{/*
Generate a full image name with optional registry prefix and tag.
*/}}
{{- define "ecommerce.image" -}}
{{- if .Values.global.imageRegistry -}}
{{ .Values.global.imageRegistry }}/{{ .image }}:{{ .Values.global.imageTag }}
{{- else -}}
{{ .image }}:{{ .Values.global.imageTag }}
{{- end -}}
{{- end -}}

{{/*
Common labels for all resources.
*/}}
{{- define "ecommerce.labels" -}}
app.kubernetes.io/managed-by: {{ .Release.Service }}
app.kubernetes.io/part-of: ecommerce-platform
helm.sh/chart: {{ .Chart.Name }}-{{ .Chart.Version }}
environment: {{ .Values.global.namespace }}
{{- end -}}
