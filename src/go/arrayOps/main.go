package main

import (
	"context"
	"fmt"
	"math/rand"
	"sort"
	"strconv"
	"time"

	golambda "github.com/aws/aws-lambda-go/lambda"
)

type request struct {
	Size int    `json:"size"`
	Seed *int64 `json:"seed"`
}

type response struct {
	ArrayOpsResult
	DurationMs float64 `json:"durationMs"`
}

type LCG struct {
	seed int64
}

func NewLCG(seed int64) *LCG {
	return &LCG{seed: seed}
}

func (r *LCG) Next() float64 {
	r.seed = (r.seed*1103515245 + 12345) & 0x7fffffff
	return float64(r.seed) / float64(0x7fffffff)
}

type ArrayOpsResult struct {
	InputSize     int            `json:"inputSize"`
	FilteredSize  int            `json:"filteredSize"`
	TotalScore    string         `json:"totalScore"`
	GroupedCounts map[string]int `json:"groupedCounts"`
	TopItem       *TopItem       `json:"topItem"`
}

type TopItem struct {
	ID    int    `json:"id"`
	Score string `json:"score"`
}

type item struct {
	id         int
	value      float64
	category   string
	score      float64
	normalized float64
}

var categories = [4]string{"A", "B", "C", "D"}

func RunArrayOps(size int, seed *int64) ArrayOpsResult {
	var nextRand func() float64
	if seed != nil {
		lcg := NewLCG(*seed)
		nextRand = lcg.Next
	} else {
		nextRand = rand.Float64
	}

	arr := make([]item, size)
	for i := range arr {
		v := nextRand()
		arr[i] = item{
			id:       i,
			value:    v,
			category: categories[int(nextRand()*4)],
		}
	}

	filtered := arr[:0:0]
	for _, x := range arr {
		if x.value > 0.3 {
			filtered = append(filtered, x)
		}
	}

	for i := range filtered {
		filtered[i].score = filtered[i].value * 100
		filtered[i].normalized = filtered[i].value / 0.7
	}

	sort.Slice(filtered, func(i, j int) bool {
		return filtered[i].score > filtered[j].score
	})

	total := 0.0
	for _, x := range filtered {
		total += x.score
	}

	grouped := make(map[string]int)
	for _, x := range filtered {
		grouped[x.category]++
	}

	var topItem *TopItem
	if len(filtered) > 0 {
		topItem = &TopItem{
			ID:    filtered[0].id,
			Score: strconv.FormatFloat(filtered[0].score, 'f', 2, 64),
		}
	}

	return ArrayOpsResult{
		InputSize:     size,
		FilteredSize:  len(filtered),
		TotalScore:    fmt.Sprintf("%.2f", total),
		GroupedCounts: grouped,
		TopItem:       topItem,
	}
}

func handler(_ context.Context, req request) (response, error) {
	start := time.Now()
	result := RunArrayOps(req.Size, req.Seed)
	durationMs := float64(time.Since(start).Nanoseconds()) / 1e6
	return response{result, durationMs}, nil
}

func main() {
	golambda.Start(handler)
}
