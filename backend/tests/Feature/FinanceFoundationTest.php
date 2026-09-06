<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FinanceFoundationTest extends TestCase
{
    use RefreshDatabase;

    private function configuredUser(): User
    {
        return User::factory()->create(['currency' => 'EUR', 'timezone' => 'Europe/Belgrade']);
    }

    private function account(array $changes = []): array
    {
        return array_merge(['name' => 'Main bank', 'type' => 'checking', 'opening_balance' => '1234.56', 'opening_date' => '2026-01-01'], $changes);
    }

    public function test_settings_require_explicit_currency_and_persist_only_for_current_user(): void
    {
        $user = User::factory()->create();
        $other = $this->configuredUser();
        $this->actingAs($user)->getJson('/api/settings')->assertOk()
            ->assertJsonPath('user.currency', null)->assertJsonPath('user.timezone', null);
        $this->putJson('/api/settings', ['currency' => 'RSD', 'timezone' => 'Europe/Belgrade', 'user_id' => $other->id, 'currency_locked' => true])
            ->assertOk()->assertJsonPath('currency', 'RSD')->assertJsonPath('currency_locked', false);
        $this->assertSame('RSD', $user->fresh()->currency);
        $this->assertSame('EUR', $other->fresh()->currency);
        $this->putJson('/api/settings', ['currency' => 'USD', 'timezone' => 'UTC'])->assertOk();
        $this->putJson('/api/settings', ['currency' => 'ZZZ', 'timezone' => 'invalid'])
            ->assertUnprocessable()->assertJsonValidationErrors(['currency', 'timezone']);
    }

    public function test_accounts_require_preferences_and_lock_currency_permanently(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user)->postJson('/api/accounts', $this->account())->assertUnprocessable()->assertJsonValidationErrors('currency');
        $this->putJson('/api/settings', ['currency' => 'EUR', 'timezone' => 'UTC'])->assertOk();
        $id = $this->postJson('/api/accounts', $this->account())->assertCreated()->json('data.id');
        $this->assertTrue($user->fresh()->currency_locked);
        $this->putJson('/api/settings', ['currency' => 'USD', 'timezone' => 'UTC'])->assertUnprocessable()->assertJsonValidationErrors('currency');
        $this->putJson('/api/settings', ['currency' => 'EUR', 'timezone' => 'Europe/Belgrade'])->assertOk();
        $this->deleteJson('/api/accounts/'.$id)->assertNoContent();
        $this->putJson('/api/settings', ['currency' => 'USD', 'timezone' => 'UTC'])->assertUnprocessable();
    }

    public function test_account_crud_archive_and_exact_money_storage(): void
    {
        $user = $this->configuredUser();
        $other = $this->configuredUser();
        $created = $this->actingAs($user)->postJson('/api/accounts', $this->account(['user_id' => $other->id]))
            ->assertCreated()->assertJsonPath('data.opening_balance', '1234.56')->assertJsonPath('data.is_active', true);
        $id = $created->json('data.id');
        $this->assertDatabaseHas('accounts', ['id' => $id, 'user_id' => $user->id, 'opening_balance' => 123456]);
        $this->putJson('/api/accounts/'.$id, $this->account(['name' => 'Credit card', 'type' => 'credit', 'opening_balance' => '-0.01', 'description' => 'Debt']))
            ->assertOk()->assertJsonPath('data.opening_balance', '-0.01')->assertJsonPath('data.name', 'Credit card');
        $this->assertDatabaseHas('accounts', ['id' => $id, 'opening_balance' => -1]);
        $this->patchJson('/api/accounts/'.$id, ['is_active' => false])->assertOk()->assertJsonPath('data.is_active', false);
        $this->getJson('/api/accounts')->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.is_active', false);
        $this->patchJson('/api/accounts/'.$id, ['is_active' => true, 'opening_balance' => '999999999999.99'])->assertOk()->assertJsonPath('data.opening_balance', '999999999999.99');
        $this->getJson('/api/accounts/'.$id)->assertOk()->assertJsonPath('data.is_active', true);
        $this->deleteJson('/api/accounts/'.$id)->assertNoContent();
        $this->assertDatabaseMissing('accounts', ['id' => $id]);
    }

    public function test_account_money_and_date_validation(): void
    {
        $user = $this->configuredUser();
        $this->actingAs($user);
        foreach (['1.001', '1,25', '1e3', '1000000000000.00', 'NaN', 1.25] as $invalid) {
            $this->postJson('/api/accounts', $this->account(['opening_balance' => $invalid]))
                ->assertUnprocessable()->assertJsonValidationErrors('opening_balance');
        }
        $this->postJson('/api/accounts', $this->account(['name' => '', 'type' => 'invalid', 'opening_date' => '2026-02-30']))
            ->assertUnprocessable()->assertJsonValidationErrors(['name', 'type', 'opening_date']);
        $this->assertDatabaseCount('accounts', 0);
        $this->assertFalse($user->fresh()->currency_locked);
    }

    public function test_opening_date_uses_the_users_timezone(): void
    {
        $this->travelTo(now()->setTimezone('UTC')->setDate(2026, 9, 6)->setTime(0, 30));
        $user = User::factory()->create(['currency' => 'USD', 'timezone' => 'Pacific/Honolulu']);
        $this->actingAs($user)->getJson('/api/settings')->assertJsonPath('today', '2026-09-05');
        $this->postJson('/api/accounts', $this->account(['opening_date' => '2026-09-06']))->assertUnprocessable()->assertJsonValidationErrors('opening_date');
        $this->postJson('/api/accounts', $this->account(['opening_date' => '2026-09-05']))->assertCreated();
    }

    public function test_other_users_cannot_list_read_edit_or_delete_accounts_or_categories(): void
    {
        $owner = $this->configuredUser();
        $intruder = $this->configuredUser();
        $this->actingAs($owner);
        $account = $this->postJson('/api/accounts', $this->account())->json('data.id');
        $category = $this->postJson('/api/categories', ['name' => 'Private', 'type' => 'expense'])->json('data.id');
        $this->actingAs($intruder);
        foreach (['accounts' => $account, 'categories' => $category] as $resource => $id) {
            $this->getJson('/api/'.$resource.'?user_id='.$owner->id)->assertOk()->assertJsonCount(0, 'data');
            $this->getJson('/api/'.$resource.'/'.$id)->assertNotFound();
            $this->putJson('/api/'.$resource.'/'.$id, [])->assertNotFound();
            $this->deleteJson('/api/'.$resource.'/'.$id)->assertNotFound();
        }
        $this->assertDatabaseHas('accounts', ['id' => $account, 'user_id' => $owner->id]);
        $this->assertDatabaseHas('categories', ['id' => $category, 'user_id' => $owner->id]);
    }

    public function test_categories_are_customizable_and_duplicates_are_scoped_and_case_insensitive(): void
    {
        $user = $this->configuredUser();
        $other = $this->configuredUser();
        $this->actingAs($user);
        $id = $this->postJson('/api/categories', ['name' => ' Coffee ', 'type' => 'expense', 'user_id' => $other->id])
            ->assertCreated()->assertJsonPath('data.name', 'Coffee')->assertJsonMissingPath('data.name_key')->json('data.id');
        $this->assertDatabaseHas('categories', ['id' => $id, 'user_id' => $user->id]);
        $this->postJson('/api/categories', ['name' => 'COFFEE', 'type' => 'expense'])->assertUnprocessable()->assertJsonValidationErrors('name');
        $this->postJson('/api/categories', ['name' => 'Coffee', 'type' => 'income'])->assertCreated();
        $this->putJson('/api/categories/'.$id, ['name' => 'Coffee', 'type' => 'income'])->assertUnprocessable()->assertJsonValidationErrors('name');
        $this->putJson('/api/categories/'.$id, ['name' => 'Cafe', 'type' => 'expense'])->assertOk()->assertJsonPath('data.name', 'Cafe');
        $this->deleteJson('/api/categories/'.$id)->assertNoContent();
        $this->actingAs($other)->postJson('/api/categories', ['name' => 'Coffee', 'type' => 'income'])->assertCreated();
    }

    public function test_registration_and_existing_user_backfill_provide_default_categories(): void
    {
        $this->postJson('/api/register', ['name' => 'New user', 'email' => 'new@example.com', 'password' => 'a-long-test-password', 'password_confirmation' => 'a-long-test-password'])->assertCreated();
        $newUser = User::where('email', 'new@example.com')->firstOrFail();
        $this->assertSame(11, $newUser->categories()->count());
        $legacyUser = User::factory()->create();
        $migration = require database_path('migrations/2026_09_06_000002_seed_existing_user_categories.php');
        $migration->up();
        $migration->up();
        $this->assertSame(11, $legacyUser->categories()->count());
        $this->assertSame(11, $newUser->categories()->count());
        $this->assertNull($legacyUser->fresh()->currency);
        $this->assertNull($legacyUser->fresh()->timezone);
        $this->assertSame(3, $legacyUser->categories()->where('type', 'income')->count());
        $category = $legacyUser->categories()->where('name', 'Salary')->firstOrFail();
        $this->actingAs($legacyUser)->putJson('/api/categories/'.$category->id, ['name' => 'Pay', 'type' => 'income'])->assertOk();
    }

    public function test_finance_endpoints_require_authentication(): void
    {
        foreach (['settings', 'accounts', 'categories'] as $path) {
            $this->getJson('/api/'.$path)->assertUnauthorized();
        }
        $this->putJson('/api/settings', [])->assertUnauthorized();
        foreach (['accounts', 'categories'] as $path) {
            $this->postJson('/api/'.$path, [])->assertUnauthorized();
            $this->putJson('/api/'.$path.'/1', [])->assertUnauthorized();
            $this->deleteJson('/api/'.$path.'/1')->assertUnauthorized();
        }
    }
}
