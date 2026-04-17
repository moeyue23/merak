package common

import "time"

type ErrorResponse struct {
	Code      int    `json:"code"`
	Message   string `json:"message"`
	Timestamp int64  `json:"timestamp"`
}

type ApiResponse struct {
	Code      int         `json:"code"`
	Message   string      `json:"message"`
	Timestamp int64       `json:"timestamp"`
	Data      interface{} `json:"data"`
}

func NewErrorResponse(code int, message string) ErrorResponse {
	return ErrorResponse{
		Code:      code,
		Message:   message,
		Timestamp: time.Now().UnixMilli(),
	}
}

func NewApiResponse(code int, message string, data interface{}) ApiResponse {
	return ApiResponse{
		Code:      code,
		Message:   message,
		Timestamp: time.Now().UnixMilli(),
		Data:      data,
	}
}

func OkResponse(data interface{}) ApiResponse {
	return NewApiResponse(CODE_OK, "OK", data)
}
