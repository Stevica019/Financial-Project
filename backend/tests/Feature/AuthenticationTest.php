<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AuthenticationTest extends TestCase
{
    use RefreshDatabase;

    private function registration(array $overrides = []): array
    {
        return array_merge([
            'name' => 'Alex',
            'email' => 'alex@example.com',
            'password' => 'a-long-test-password',
            'password_confirmation' => 'a-long-test-password',
        ], $overrides);
    }

    public function test_registration_normalizes_email_hashes_password_and_signs_in(): void
    {
        $this->postJson('/api/register', $this->registration(['email' => 'Alex@Example.COM']))
            ->assertCreated()
            ->assertJsonPath('email', 'alex@example.com')
            ->assertJsonMissingPath('password')
            ->assertJsonMissingPath('remember_token');

        $user = User::sole();
        $this->assertTrue(Hash::check('a-long-test-password', $user->password));
        $this->assertAuthenticatedAs($user, 'web');
        $this->getJson('/api/user')->assertOk()->assertJsonPath('id', $user->id);
    }

    public function test_registration_validates_required_fields_confirmation_and_duplicate_email(): void
    {
        $this->postJson('/api/register', [])->assertUnprocessable()->assertJsonValidationErrors(['name', 'email', 'password']);
        $this->postJson('/api/register', $this->registration(['password_confirmation' => 'different']))
            ->assertUnprocessable()->assertJsonValidationErrors('password');
        User::factory()->create(['email' => 'alex@example.com']);
        $this->postJson('/api/register', $this->registration(['email' => 'ALEX@example.com']))
            ->assertUnprocessable()->assertJsonValidationErrors('email');
        $this->assertDatabaseCount('users', 1);
        $this->assertGuest();
    }

    public function test_registration_rejects_short_and_overlong_multibyte_passwords(): void
    {
        foreach (['short', str_repeat('é', 40), "long-password\0invalid"] as $password) {
            $this->postJson('/api/register', $this->registration([
                'password' => $password, 'password_confirmation' => $password,
            ]))->assertUnprocessable()->assertJsonValidationErrors('password');
        }
        $this->assertDatabaseCount('users', 0);
    }

    public function test_login_regenerates_session_and_returns_only_the_authenticated_user(): void
    {
        $user = User::factory()->create(['email' => 'alex@example.com']);
        $other = User::factory()->create();
        $this->withSession(['marker' => 'before-login']);
        $oldSession = session()->getId();

        $this->postJson('/api/login', ['email' => 'ALEX@example.com', 'password' => 'password'])
            ->assertOk()->assertJsonPath('id', $user->id)->assertJsonMissingPath('password');

        $this->assertNotSame($oldSession, session()->getId());
        $this->assertAuthenticatedAs($user, 'web');
        $this->getJson('/api/user?user_id='.$other->id)->assertOk()->assertJsonPath('id', $user->id);
    }

    public function test_incorrect_and_unknown_credentials_have_the_same_error(): void
    {
        User::factory()->create(['email' => 'alex@example.com']);
        $wrong = $this->postJson('/api/login', ['email' => 'alex@example.com', 'password' => 'wrong-password'])
            ->assertUnprocessable()->assertJsonValidationErrors('email');
        $unknown = $this->postJson('/api/login', ['email' => 'unknown@example.com', 'password' => 'wrong-password'])
            ->assertUnprocessable();
        $this->assertSame($wrong->json(), $unknown->json());
        $this->assertGuest();
    }

    public function test_login_is_rate_limited(): void
    {
        for ($attempt = 0; $attempt < 5; $attempt++) {
            $this->postJson('/api/login', ['email' => 'alex@example.com', 'password' => 'wrong-password'])
                ->assertUnprocessable();
        }
        $this->postJson('/api/login', ['email' => 'ALEX@example.com', 'password' => 'wrong-password'])
            ->assertStatus(429)->assertHeader('Retry-After');
    }

    public function test_login_rejects_passwords_that_would_be_truncated_by_bcrypt(): void
    {
        User::factory()->create(['email' => 'alex@example.com', 'password' => str_repeat('é', 36)]);
        $this->postJson('/api/login', ['email' => 'alex@example.com', 'password' => str_repeat('é', 37)])
            ->assertUnprocessable()->assertJsonValidationErrors('password');
        $this->assertGuest();
    }

    public function test_registration_is_rate_limited(): void
    {
        for ($attempt = 0; $attempt < 5; $attempt++) {
            $this->postJson('/api/register', [])->assertUnprocessable();
        }
        $this->postJson('/api/register', [])->assertStatus(429);
    }

    public function test_logout_invalidates_session_and_protected_access(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user, 'web')->withSession(['private-marker' => 'remove']);
        $oldSession = session()->getId();
        $this->postJson('/api/logout')->assertNoContent()->assertSessionMissing('private-marker');
        $this->assertNotSame($oldSession, session()->getId());
        $this->assertGuest('web');
        Auth::forgetGuards();
        $this->getJson('/api/user')->assertUnauthorized();
    }

    public function test_api_authentication_errors_are_json_even_without_accept_header(): void
    {
        $this->get('/api/user')->assertUnauthorized()->assertJsonPath('message', 'Unauthenticated.');
        $this->postJson('/api/logout')->assertUnauthorized();
    }
}
