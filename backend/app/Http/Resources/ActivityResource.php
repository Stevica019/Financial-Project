<?php

namespace App\Http\Resources;

use App\Support\Money;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ActivityResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $data = (array) $this->resource;
        $data['amount'] = Money::decimal((int) $data['amount']);

        return $data;
    }
}
